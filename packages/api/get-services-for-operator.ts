import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { DataSource, getServicesForOperator, isValidMode, ServicesForOperatorQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

const isDataSource = (input: string): input is DataSource => input in DataSource;

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServicesForOperator);

export const getQueryInput = (event: APIGatewayEvent): ServicesForOperatorQueryInput => {
    const { pathParameters, queryStringParameters } = event;

    const nocCode = pathParameters?.nocCode ?? "";

    if (!nocCode) {
        throw new ClientError("NOC must be provided");
    }

    const modes = queryStringParameters?.modes ?? "";
    const modesArray = modes
        .split(",")
        .filter((mode) => mode)
        .map((mode) => mode.trim());

    const filteredModesArray = modesArray.filter(isValidMode);

    if (filteredModesArray.length !== modesArray.length) {
        throw new ClientError("Invalid mode provided");
    }

    const dataSourceInput = queryStringParameters?.dataSource ?? DataSource.bods;

    if (!isDataSource(dataSourceInput)) {
        throw new ClientError("Provided dataSource must be tnds or bods");
    }

    return {
        nocCode,
        dataSource: dataSourceInput,
        ...(filteredModesArray && filteredModesArray.length > 0 ? { modes: filteredModesArray } : {}),
    };
};
