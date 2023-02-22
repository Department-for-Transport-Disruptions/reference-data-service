import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import * as logger from "lambda-log";
import crypto from "crypto";
import { ClientError } from "./error";
import { getDbClient } from "@reference-data-service/core/db";
import { getOperators, OperatorQueryInput } from "./client";

const MAX_NOC_CODES = process.env.MAX_NOC_CODES || 50;

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> => {
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

        const input = getQueryInput(event);

        logger.debug("Query input", { queryInput: input });

        const operators = await getOperators(dbClient, input);

        logger.info("Operators retrieved successfully");

        return {
            statusCode: 200,
            body: JSON.stringify(operators),
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

const getQueryInput = (event: APIGatewayEvent): OperatorQueryInput => {
    const { pathParameters, queryStringParameters } = event;

    const nocCode = pathParameters?.nocCode;

    if (nocCode) {
        return {
            nocCode,
        };
    }

    const batchNocCodes = queryStringParameters?.["nocCodes"] ?? "";
    const batchNocCodesArray = batchNocCodes.split(",").filter((a) => a);

    if (batchNocCodesArray.length > MAX_NOC_CODES) {
        throw new ClientError(`Only up to ${MAX_NOC_CODES} NOC codes can be provided`);
    }

    const page = Number(queryStringParameters?.["page"] ?? "");

    if (isNaN(page)) {
        throw new ClientError("Provided page is not valid");
    }

    return {
        ...(batchNocCodes ? { batchNocCodes: batchNocCodesArray } : {}),
        ...(page ? { page: page - 1 } : {}),
    };
};
