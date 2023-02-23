import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { ClientError } from "./error";
import { getOperators, OperatorQueryInput } from "./client";
import { executeClient } from "./execute-client";

const MAX_NOC_CODES = process.env.MAX_NOC_CODES || "5";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getOperators);

export const getQueryInput = (event: APIGatewayEvent): OperatorQueryInput => {
    const { pathParameters, queryStringParameters } = event;

    const nocCode = pathParameters?.nocCode;

    if (nocCode) {
        return {
            nocCode,
        };
    }

    const batchNocCodes = queryStringParameters?.["nocCodes"] ?? "";
    const batchNocCodesArray = batchNocCodes
        .split(",")
        .filter((nocCode) => nocCode)
        .map((nocCode) => nocCode.trim());

    if (batchNocCodesArray.length > Number(MAX_NOC_CODES)) {
        throw new ClientError(`Only up to ${MAX_NOC_CODES} NOC codes can be provided`);
    }

    const page = Number(queryStringParameters?.["page"] ?? "1");

    if (isNaN(page)) {
        throw new ClientError("Provided page is not valid");
    }

    return {
        ...(batchNocCodes ? { batchNocCodes: batchNocCodesArray } : {}),
        page: page - 1,
    };
};
