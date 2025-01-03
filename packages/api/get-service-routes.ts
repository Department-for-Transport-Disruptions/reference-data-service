import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import {
    ServiceStop,
    ServiceStops,
    ServiceStopsQueryInput,
    ServiceTracks,
    VehicleMode,
    getServiceStops,
    isDataSource,
    isValidMode,
} from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";
import { flattenStops } from "./get-service-stops";
import { isServiceStops } from "./utils";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceStops, formatStopsRoutes);

export const getQueryInput = (event: APIGatewayEvent): ServiceStopsQueryInput => {
    const { pathParameters, queryStringParameters } = event;

    const serviceRef = pathParameters?.serviceId;

    if (!serviceRef) {
        throw new ClientError("Service Ref must be provided");
    }

    const dataSourceInput = queryStringParameters?.dataSource || "bods";

    if (!isDataSource(dataSourceInput)) {
        throw new ClientError("Invalid datasource provided");
    }

    const modes = queryStringParameters?.modes || "";
    const modesArray = modes
        .split(",")
        .filter((mode) => mode)
        .map((mode) => mode.trim());

    const filteredModesArray = modesArray.filter(isValidMode);

    if (filteredModesArray.length !== modesArray.length) {
        throw new ClientError("Invalid mode provided");
    }

    if (filteredModesArray.includes(VehicleMode.bus)) {
        filteredModesArray.push(VehicleMode.blank);
    }

    return {
        serviceRef,
        dataSource: dataSourceInput,
        ...(filteredModesArray && filteredModesArray.length > 0 ? { modes: filteredModesArray } : {}),
        useTracks: true,
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
    stops: ServiceStops | ServiceTracks,
): Promise<{ outbound: ServiceStop[] | ServiceTracks; inbound: ServiceStop[] }> => {
    if (isServiceStops(stops)) {
        const flattenedStops = flattenStops(stops);

        const outbound = filterStops(flattenedStops, "outbound");
        const inbound = filterStops(flattenedStops, "inbound");
        return { outbound, inbound };
    }
    return { outbound: stops, inbound: [] };
};
