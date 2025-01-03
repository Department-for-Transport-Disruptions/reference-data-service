import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { RoadworksQueryInput, getRoadworks } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";
import { permitStatus } from "./utils/roadworkTypes.zod";

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

    if (Number.isNaN(page)) {
        throw new ClientError("Provided page is not valid");
    }

    const parsedPermitStatus = permitStatus.safeParse(queryStringParameters?.permitStatus ?? "");

    const lastUpdatedTimeDelta = Number(queryStringParameters?.lastUpdatedTimeDelta) ?? null;

    const createdTimeDelta = Number(queryStringParameters?.createdTimeDelta) ?? null;

    return {
        ...(adminAreaCodes ? { adminAreaCodes: adminAreaCodeArray } : {}),
        ...(parsedPermitStatus.success ? { permitStatus: parsedPermitStatus.data } : {}),
        ...(lastUpdatedTimeDelta ? { lastUpdatedTimeDelta: lastUpdatedTimeDelta } : {}),
        ...(createdTimeDelta ? { createdTimeDelta: createdTimeDelta } : {}),
        page: page - 1,
    };
};
