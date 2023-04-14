import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getServiceStops, ServiceStop, ServiceStops, ServiceStopsQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";
import { flattenStops } from "./get-service-stops";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceStops, formatStopsRoutes);

export const getQueryInput = (event: APIGatewayEvent): ServiceStopsQueryInput => {
    const { pathParameters } = event;

    const serviceId = pathParameters?.serviceId;

    if (!serviceId) {
        throw new ClientError("Service ID must be provided");
    }

    if (isNaN(Number(serviceId))) {
        throw new ClientError("Provided service ID is not valid");
    }

    return {
        serviceId: Number(serviceId),
    };
};

export const formatStopsRoutes = (stops: ServiceStops): { outbound: ServiceStop[]; inbound: ServiceStop[] } => {
    const flattenedStops = flattenStops(stops);
    const outbound = flattenedStops
        .filter((stop) => stop.direction === "outbound")
        .sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber))
        .filter((c, i) => c.atcoCode !== flattenedStops[i + 1].atcoCode);
    const inbound = flattenedStops
        .filter((stop) => stop.direction === "inbound")
        .sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber))
        .filter((c, i) => c.atcoCode !== flattenedStops[i + 1].atcoCode);
    return { outbound, inbound };
};
