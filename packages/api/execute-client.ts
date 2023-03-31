import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import * as logger from "lambda-log";
import crypto from "crypto";
import { ClientError } from "./error";
import { Database, getDbClient } from "@reference-data-service/core/db";
import { Kysely } from "kysely";

export const executeClient = async <InputT, ResponseT, FormattedT>(
    event: APIGatewayEvent,
    getQueryInputFunction: (event: APIGatewayEvent) => InputT,
    clientFunction: (client: Kysely<Database>, input: InputT) => Promise<ResponseT>,
    formatterFunction?: (input: ResponseT) => FormattedT | null,
): Promise<APIGatewayProxyResultV2> => {
    try {
        logger.options.dev = process.env.NODE_ENV !== "production";
        logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

        logger.options.meta = {
            path: event.path,
            method: event.httpMethod,
            pathParams: event.pathParameters,
            queryParams: event.queryStringParameters,
            id: crypto.randomUUID(),
        };

        logger.info("Starting request");

        const dbClient = getDbClient();

        const input = getQueryInputFunction(event);

        logger.debug("Query input", { queryInput: input });

        const result = await clientFunction(dbClient, input);

        logger.info(`${clientFunction.name} called successfully`);

        if (formatterFunction) {
            const formattedResult = formatterFunction(result);

            return {
                statusCode: 200,
                body: JSON.stringify(formattedResult),
                headers: {
                    "content-type": "application/json",
                },
            };
        }

        if (!result) {
            return {
                statusCode: 404,
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result),
            headers: {
                "content-type": "application/json",
            },
        };
    } catch (e) {
        if (e instanceof ClientError) {
            logger.error(e);

            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: e.message,
                }),
            };
        } else if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the service",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the service",
            }),
        };
    }
};
