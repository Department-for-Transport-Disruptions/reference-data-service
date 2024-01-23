import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { RoadworksQueryInput, getRoadworks } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

const MAX_ADMIN_AREA_CODES = process.env.MAX_ADMIN_AREA_CODES || "5";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getRoadworks);

export const getQueryInput = (event: APIGatewayEvent): RoadworksQueryInput => {
    const { queryStringParameters } = event;

    const adminAreaCodes = queryStringParameters?.adminAreaCodes ?? "";
    const adminAreaCodeArray = adminAreaCodes
        .split(",")
        .filter((adminAreaCode) => adminAreaCode)
        .map((adminAreaCode) => adminAreaCode.trim());

    if (adminAreaCodeArray.length > Number(MAX_ADMIN_AREA_CODES)) {
        throw new ClientError(`Only up to ${MAX_ADMIN_AREA_CODES} administrative area codes can be provided`);
    }

    const page = Number(queryStringParameters?.page ?? "1");

    if (isNaN(page)) {
        throw new ClientError("Provided page is not valid");
    }

    const showRecentlyCancelled = queryStringParameters?.showRecentlyCancelled ?? "";

    return {
        ...(adminAreaCodes ? { adminAreaCodes: adminAreaCodeArray } : {}),
        ...(showRecentlyCancelled === "true" ? { showRecentlyCancelled: true } : {}),
        page: page - 1,
    };
};
