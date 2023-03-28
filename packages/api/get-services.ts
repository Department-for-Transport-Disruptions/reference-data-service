import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { DataSource, getServices, ServicesQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

const MAX_ADMIN_AREA_CODES = process.env.MAX_ADMIN_AREA_CODES || "5";

const isDataSource = (input: string): input is DataSource => input in DataSource;

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServices);

export const getQueryInput = (event: APIGatewayEvent): ServicesQueryInput => {
    const { queryStringParameters } = event;

    const modes = queryStringParameters?.modes ?? "";
    const modesArray = modes
        .split(",")
        .filter((mode) => mode)
        .map((mode) => mode.trim());

    const dataSourceInput = queryStringParameters?.dataSource ?? DataSource.bods;

    if (!isDataSource(dataSourceInput)) {
        throw new ClientError("Provided dataSource must be tnds or bods");
    }

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

    return {
        dataSource: dataSourceInput,
        page: page - 1,
        ...(adminAreaCodes && adminAreaCodeArray.length > 0 ? { adminAreaCodes: adminAreaCodeArray } : {}),
        ...(modesArray && modesArray.length > 0 ? { modes: modesArray } : {}),
    };
};
