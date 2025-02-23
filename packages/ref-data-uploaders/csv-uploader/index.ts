import { randomUUID } from "crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Tables, TablesNew, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { putTableRenamerDisableParameter } from "@reference-data-service/core/ssm";
import { S3Event } from "aws-lambda";
import { Promise as BluebirdPromise } from "bluebird";
import { RawBuilder, sql } from "kysely";
import * as logger from "lambda-log";
import OsPoint from "ospoint";
import { parse } from "papaparse";

const dbClient = getDbClient();
const s3Client = new S3Client({ region: "eu-west-2" });

export const main = async (event: S3Event) => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    const { STAGE: stage } = process.env;

    try {
        await waitForDb(dbClient);
        const key = event.Records[0].s3.object.key;

        logger.info(`Starting CSV Uploader for ${key}`);

        const file = await s3Client.send(
            new GetObjectCommand({
                Bucket: event.Records[0].s3.bucket.name,
                Key: key,
            }),
        );

        const body = (await file.Body?.transformToString()) || "";

        let { data } = parse(body, {
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

        if (key === "Stops.csv") {
            data = (
                data as {
                    longitude: string;
                    latitude: string;
                    easting: string;
                    northing: string;
                }[]
            ).map((item) => {
                if ((!item.longitude || !item.latitude) && item.easting && item.northing) {
                    const osPoint = new OsPoint(item.northing, item.easting);

                    const wgs84 = osPoint?.toWGS84();

                    if (wgs84) {
                        return {
                            ...item,
                            longitude: wgs84.longitude,
                            latitude: wgs84.latitude,
                        };
                    }
                }

                return {
                    ...item,
                };
            });
        }

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

        await BluebirdPromise.map(
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
        if (stage) {
            await putTableRenamerDisableParameter(stage, "true", logger);
        }
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
