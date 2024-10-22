import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { DataSource, ServiceByIdQueryInput, getServiceById, isDataSource } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceById);

export const getQueryInput = (event: APIGatewayEvent): ServiceByIdQueryInput => {
    const { pathParameters, queryStringParameters } = event;

    const nocCode = pathParameters?.nocCode ?? "";

    if (!nocCode) {
        throw new ClientError("NOC must be provided");
    }

    const serviceRef = pathParameters?.serviceId;

    if (!serviceRef) {
        throw new ClientError("Service ref must be provided");
    }

    const dataSourceInput = queryStringParameters?.dataSource;

    return {
        nocCode,
        serviceRef: serviceRef,
        dataSource: dataSourceInput && isDataSource(dataSourceInput) ? dataSourceInput : DataSource.bods,
    };
};
