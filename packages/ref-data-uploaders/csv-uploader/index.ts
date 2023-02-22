import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getDbClient, Tables, TablesNew } from "@reference-data-service/core/db";
import { S3Event } from "aws-lambda";
import { Promise } from "bluebird";
import { randomUUID } from "crypto";
import { RawBuilder, sql } from "kysely";
import * as logger from "lambda-log";
import { parse } from "papaparse";

const dbClient = getDbClient();
const s3Client = new S3Client({ region: "eu-west-2" });

export const main = async (event: S3Event) => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    try {
        const key = event.Records[0].s3.object.key;

        logger.info(`Starting CSV Uploader for ${key}`);

        const file = await s3Client.send(
            new GetObjectCommand({
                Bucket: event.Records[0].s3.bucket.name,
                Key: key,
            }),
        );

        const body = (await file.Body?.transformToString()) || "";

        const { data } = parse(body, {
            skipEmptyLines: "greedy",
            header: true,
            transformHeader: (header) => {
                const headerMap: { [key: string]: string } = {
                    VOSA_PSVLicenseName: "vosaPsvLicenseName",
                    NOCCODE: "nocCode",
                    ATCOCode: "atcoCode",
                    NOCLineNo: "nocLineNo",
                    "New Bharat": "newBharat",
                    Yorks_RT: "yorksRt",
                    "Travel Enq": "travelEnq",
                    "Date Ceased": "dateCeased",
                    "Cessation Comment": "cessationComment",
                };

                return headerMap[header] ?? header.charAt(0).toLowerCase() + header.slice(1);
            },
        });

        const numRows = data.length;

        const batches = [];
        while (data.length > 0) {
            const chunk = data.splice(0, 200);
            batches.push(chunk);
        }

        logger.info(`Uploading ${numRows} rows to the database in ${batches.length} batches`);

        let table: Tables;
        let sqlString: RawBuilder<unknown>;

        switch (key) {
            case "Stops.csv":
                table = "stops";
                sqlString = sql`CREATE TABLE stops_new LIKE stops`;
                break;

            case "NOCLines.csv":
                table = "operator_lines";
                sqlString = sql`CREATE TABLE operator_lines_new LIKE operator_lines`;
                break;

            case "NOCTable.csv":
                table = "operators";
                sqlString = sql`CREATE TABLE operators_new LIKE operators`;
                break;

            case "PublicName.csv":
                table = "operator_public_data";
                sqlString = sql`CREATE TABLE operator_public_data_new LIKE operator_public_data`;
                break;

            default:
                throw new Error("Unknown file");
        }

        const newTable: TablesNew = `${table}_new`;

        await dbClient.schema.dropTable(newTable).ifExists().execute();
        await sqlString.execute(dbClient);

        await Promise.map(
            batches,
            (batch) => {
                return dbClient
                    .insertInto(newTable)
                    .values(batch)
                    .execute()
                    .then(() => 0);
            },
            {
                concurrency: 10,
            },
        );
    } catch (e) {
        if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the csv uploader",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the csv uploader",
            }),
        };
    }
};
