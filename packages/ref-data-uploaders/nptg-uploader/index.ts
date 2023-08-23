import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import { Database, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { S3Event } from "aws-lambda";
import { Promise } from "bluebird";
import { randomUUID } from "crypto";
import * as logger from "lambda-log";
import { parseStringPromise } from "xml2js";
import { Nptg, nptgSchema } from "./zod";
import { Kysely, sql } from "kysely";

export const setupTables = async (dbClient: Kysely<Database>) => {
    await dbClient.schema.dropTable("nptg_admin_areas_new").ifExists().execute();
    await dbClient.schema.dropTable("localities_new").ifExists().execute();

    await sql`CREATE TABLE nptg_admin_areas_new LIKE nptg_admin_areas`.execute(dbClient);
    await sql`CREATE TABLE localities_new LIKE localities`.execute(dbClient);
};

export const writeToAdminAreasTable = async (adminAreas: Nptg["adminAreas"], dbClient: Kysely<Database>) => {
    await dbClient.insertInto("nptg_admin_areas_new").values(adminAreas).execute();
};

const uploadAdminAreas = async (adminAreas: Nptg["adminAreas"], dbClient: Kysely<Database>) => {
    logger.info(`Uploading ${adminAreas.length} admin areas to the database`);

    await writeToAdminAreasTable(adminAreas, dbClient);
};

export const writeToLocalitiesTable = async (batch: Nptg["localities"], dbClient: Kysely<Database>) => {
    await dbClient
        .insertInto("localities_new")
        .values(batch)
        .execute()
        .then(() => 0);
};

const uploadLocalities = async (localities: Nptg["localities"], dbClient: Kysely<Database>) => {
    const localitiesWithParents = localities.map((locality) => {
        const parentLocality = localities.find(
            (pLocality) => pLocality.nptgLocalityCode === locality.parentLocalityRef,
        );

        delete locality.parentLocalityRef;

        return {
            ...locality,
            parentLocalityName: parentLocality?.localityName ?? null,
            parentLocalityNameLang: parentLocality?.localityNameLang ?? null,
        };
    });

    const localitiesBatches = [];

    const numLocalitiesRows = localitiesWithParents.length;

    while (localitiesWithParents.length > 0) {
        const chunk = localitiesWithParents.splice(0, 200);
        localitiesBatches.push(chunk);
    }

    logger.info(`Uploading ${numLocalitiesRows} rows to the database in ${localitiesBatches.length} batches`);

    await Promise.map(localitiesBatches, (batch) => writeToLocalitiesTable(batch, dbClient), {
        concurrency: 10,
    });
};

export const parseNptgAndUpload = async (nptgString: string, dbClient: Kysely<Database>) => {
    const nptgJson = (await parseStringPromise(nptgString, {
        explicitArray: false,
    })) as Record<string, unknown>;

    const { adminAreas, localities } = nptgSchema.parse(nptgJson);

    await setupTables(dbClient);

    await uploadAdminAreas(adminAreas, dbClient);
    await uploadLocalities(localities, dbClient);
};

export const main = async (event: S3Event) => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    const { STAGE: stage } = process.env;

    const dbClient = getDbClient();

    const s3Client = new S3Client({ region: "eu-west-2" });

    try {
        await waitForDb(dbClient);
        const key = event.Records[0].s3.object.key;

        logger.info(`Starting NPTG Uploader`);

        const file = await s3Client.send(
            new GetObjectCommand({
                Bucket: event.Records[0].s3.bucket.name,
                Key: key,
            }),
        );

        const body = (await file.Body?.transformToString()) || "";

        await parseNptgAndUpload(body, dbClient);

        logger.info("NPTG upload complete");
    } catch (e) {
        if (stage) {
            await putParameter(`/scheduled/disable-table-renamer-${stage}`, "true");
        }
        if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the nptg uploader",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the nptg uploader",
            }),
        };
    }
};

const putParameter = async (key: string, value: string) => {
    const ssm = new SSMClient({ region: "eu-west-2" });

    try {
        const input = {
            Name: key,
            Value: value,
            Type: "String",
            Overwrite: true,
        };
        const command = new PutParameterCommand(input);
        await ssm.send(command);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(error);
        }
    }
};
