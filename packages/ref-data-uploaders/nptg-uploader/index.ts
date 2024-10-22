import { randomUUID } from "crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Database, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { putTableRenamerDisableParameter } from "@reference-data-service/core/ssm";
import { S3Event } from "aws-lambda";
import { Promise as BluebirdPromise } from "bluebird";
import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";
import { parseStringPromise } from "xml2js";
import { Nptg, nptgSchema } from "./zod";

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

        // biome-ignore lint/performance/noDelete: parentLocalityRef not used
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

    await BluebirdPromise.map(localitiesBatches, (batch) => writeToLocalitiesTable(batch, dbClient), {
        concurrency: 10,
    });
};

export const parseNptgAndUpload = async (nptgString: string, dbClient: Kysely<Database>) => {
    const nptgJson = (await parseStringPromise(nptgString, {
        explicitArray: false,
    })) as Record<string, unknown>;

    const { adminAreas, localities } = nptgSchema.parse(nptgJson);

    await setupTables(dbClient);

    await Promise.all([uploadAdminAreas(adminAreas, dbClient), uploadLocalities(localities, dbClient)]);
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

        logger.info("Starting NPTG Uploader");

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
            await putTableRenamerDisableParameter(stage, "true", logger);
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
