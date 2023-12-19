import { InvocationType, InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import * as logger from "lambda-log";
import { randomUUID } from "crypto";
import { Kysely, sql } from "kysely";
import { Database, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { putTableRenamerDisableParameter } from "@reference-data-service/core/ssm";

const lambdaClient = new LambdaClient({ region: "eu-west-2" });

const regionCodes = ["EA", "EM", "L", "NE", "NW", "S", "SE", "SW", "W", "WM", "Y"];

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

export const main = async () => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    const {
        REGION_RETRIEVER_FUNCTION_NAME: regionRetrieverFunctionName,
        TNDS_RETRIEVER_FUNCTION_NAME: tndsRetrieverFunctionName,
        STAGE: stage,
    } = process.env;

    if (!regionRetrieverFunctionName || !tndsRetrieverFunctionName || !stage) {
        throw new Error(
            "Missing env vars - REGION_RETRIEVER_FUNCTION_NAME, TNDS_RETRIEVER_FUNCTION_NAME and STAGE must be set",
        );
    }

    try {
        const dbClient = getDbClient();

        await setupTables(dbClient);

        await Promise.all(
            regionCodes.map((region) =>
                lambdaClient.send(
                    new InvokeCommand({
                        FunctionName: regionRetrieverFunctionName,
                        InvocationType: InvocationType.Event,
                        Payload: JSON.stringify({ REGION_CODE: region }),
                    }),
                ),
            ),
        );

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

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the data retriever",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the data retriever",
            }),
        };
    }
};
