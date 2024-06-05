import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getServiceJourneys, isDataSource, ServiceJourneys, ServiceJourneysQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceJourneys, formatJourneys);

export const getQueryInput = (event: APIGatewayEvent): ServiceJourneysQueryInput => {
    const { pathParameters, queryStringParameters } = event;

    const serviceRef = pathParameters?.serviceId;

    if (!serviceRef) {
        throw new ClientError("Service Ref must be provided");
    }

    const page = Number(queryStringParameters?.page ?? "1");

    if (isNaN(page)) {
        throw new ClientError("Provided page is not valid");
    }

    const dataSourceInput = queryStringParameters?.dataSource || "bods";

    if (!isDataSource(dataSourceInput)) {
        throw new ClientError("Invalid datasource provided");
    }

    return {
        serviceRef,
        dataSource: dataSourceInput,
        page: page - 1,
    };
};

// eslint-disable-next-line @typescript-eslint/require-await
export const formatJourneys = async (journeys: ServiceJourneys): Promise<ServiceJourneys> => {
    return journeys.filter((journey) => !!journey.departureTime);
};
