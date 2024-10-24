import { randomUUID } from "crypto";
import { PassThrough, Stream } from "stream";
import { InvocationType, InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Database, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { putTableRenamerDisableParameter } from "@reference-data-service/core/ssm";
import axios from "axios";
import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";

const lambdaClient = new LambdaClient({ region: "eu-west-2" });
const s3Client = new S3Client({ region: "eu-west-2" });

export const setupTables = async (dbClient: Kysely<Database>) => {
    const tables = [
        "service_journey_pattern_links",
        "service_journey_patterns",
        "service_admin_area_codes",
        "vehicle_journeys",
        "tracks",
        "services",
    ];

    await waitForDb(dbClient);

    for (const table of tables) {
        await dbClient.schema.dropTable(`${table}_new`).ifExists().execute();
        await sql`CREATE TABLE ${sql.ref(`${table}_new`)} LIKE ${sql.ref(table)}`.execute(dbClient);
    }
};

const getBodsDataAndUploadToS3 = async (bodsUrl: string, txcZippedBucketName: string, fileName: string) => {
    logger.info("Starting retrieval of BODS data");

    const response = await axios.get<Stream>(bodsUrl, {
        responseType: "stream",
    });

    const passThrough = new PassThrough();

    const upload = new Upload({
        client: s3Client,
        params: { Bucket: txcZippedBucketName, Key: fileName, Body: passThrough },
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
    });

    response.data.pipe(passThrough);

    await upload.done();
};

export const main = async () => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    const {
        BODS_URL: bodsUrl,
        BODS_COACH_URL: bodsCoachUrl,
        TNDS_RETRIEVER_FUNCTION_NAME: tndsRetrieverFunctionName,
        STAGE: stage,
        TXC_ZIPPED_BUCKET_NAME: txcZippedBucketName,
    } = process.env;

    if (!bodsUrl || !tndsRetrieverFunctionName || !stage || !txcZippedBucketName || !bodsCoachUrl) {
        throw new Error(
            "Missing env vars - BODS_URL, BODS_COACH_URL, TNDS_RETRIEVER_FUNCTION_NAME, STAGE and TXC_ZIPPED_BUCKET_NAME must be set",
        );
    }

    try {
        const dbClient = getDbClient();

        await setupTables(dbClient);

        await getBodsDataAndUploadToS3(bodsUrl, txcZippedBucketName, "bods.zip");
        await getBodsDataAndUploadToS3(bodsCoachUrl, txcZippedBucketName, "bodsCoach.zip");

        await lambdaClient.send(
            new InvokeCommand({
                FunctionName: tndsRetrieverFunctionName,
                InvocationType: InvocationType.Event,
            }),
        );
    } catch (e) {
        await putTableRenamerDisableParameter(stage, "true", logger);

        if (e instanceof Error) {
            logger.error(e);
        }

        throw e;
    }
};
