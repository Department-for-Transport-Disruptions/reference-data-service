import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getServiceStops, isValidMode, ServiceStop, ServiceStops, ServiceStopsQueryInput } from "./client";
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

    const stopTypes = pathParameters.stopTypes || "";
    const stopTypesArray = stopTypes
        .split(",")
        .filter((stop) => stop)
        .map((stop) => stop.trim());

    const modes = pathParameters.modes || "";
    const modesArray = modes
        .split(",")
        .filter((mode) => mode)
        .map((mode) => mode.trim());

    const filteredModesArray = modesArray.filter(isValidMode);

    if (filteredModesArray.length !== modesArray.length) {
        throw new ClientError("Invalid mode provided");
    }

    return {
        serviceId: Number(serviceId),
        ...(pathParameters?.busStopType ? { busStopType: pathParameters.busStopType } : {}),
        ...(filteredModesArray && filteredModesArray.length > 0 ? { modes: filteredModesArray } : {}),
        ...(stopTypesArray && stopTypesArray.length > 0 ? { stopTypes: stopTypesArray } : {}),
    };
};

const filterStops = (flattenedStops: ServiceStop[], direction: string) => {
    const sortedStops = flattenedStops
        // filter stops by direction
        .filter((stop) => stop.direction === direction)
        // remove any duplicates on atcoCode and sequence number
        .filter(
            (stop, index, self) =>
                self.findIndex(
                    (other) => stop.atcoCode === other.atcoCode && stop.sequenceNumber === other.sequenceNumber,
                ) === index,
        )
        // sort stops by sequence number
        .sort((stop, other) => Number(stop.sequenceNumber) - Number(other.sequenceNumber));

    return (
        sortedStops
            // remove duplicate adjacent stops
            .filter((stop, i) => (i > 0 ? stop.atcoCode !== sortedStops[i - 1].atcoCode : true))
    );
};

export const formatStopsRoutes = async (
    stops: ServiceStops,
    // eslint-disable-next-line @typescript-eslint/require-await
): Promise<{ outbound: ServiceStop[]; inbound: ServiceStop[] }> => {
    const flattenedStops = flattenStops(stops);

    const outbound = filterStops(flattenedStops, "outbound");
    const inbound = filterStops(flattenedStops, "inbound");
    return { outbound, inbound };
};
