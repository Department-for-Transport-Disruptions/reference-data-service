import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getServiceStops, ServiceStop, ServiceStops, ServiceStopsQueryInput, Stops } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceStops, formatStops);

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

export const flattenStops = (stops: ServiceStops): ServiceStop[] => {
    return stops.flatMap((stop) => {
        const stopArray: ServiceStop[] = [];
        if (stop.fromStatus === "active") {
            stopArray.push({
                id: stop.fromId,
                atcoCode: stop.fromAtcoCode,
                naptanCode: stop.fromNaptanCode,
                commonName: stop.fromCommonName,
                street: stop.fromStreet,
                indicator: stop.fromIndicator,
                bearing: stop.fromBearing,
                nptgLocalityCode: stop.fromNptgLocalityCode,
                localityName: stop.fromLocalityName,
                parentLocalityName: stop.fromParentLocalityName,
                longitude: stop.fromLongitude,
                latitude: stop.fromLatitude,
                stopType: stop.fromStopType,
                busStopType: stop.fromBusStopType,
                timingStatus: stop.fromTimingStatus,
                administrativeAreaCode: stop.fromAdministrativeAreaCode,
                status: stop.fromStatus,
                direction: stop.direction || "",
                fromSequenceNumber: stop.fromSequenceNumber || "",
            });
        }

        if (stop.toStatus === "active") {
            stopArray.push({
                id: stop.toId,
                atcoCode: stop.toAtcoCode,
                naptanCode: stop.toNaptanCode,
                commonName: stop.toCommonName,
                street: stop.toStreet,
                indicator: stop.toIndicator,
                bearing: stop.toBearing,
                nptgLocalityCode: stop.toNptgLocalityCode,
                localityName: stop.toLocalityName,
                parentLocalityName: stop.toParentLocalityName,
                longitude: stop.toLongitude,
                latitude: stop.toLatitude,
                stopType: stop.toStopType,
                busStopType: stop.toBusStopType,
                timingStatus: stop.toTimingStatus,
                administrativeAreaCode: stop.toAdministrativeAreaCode,
                status: stop.toStatus,
                direction: stop.direction || "",
                fromSequenceNumber: stop.fromSequenceNumber || "",
            });
        }

        return stopArray;
    });
};

export const formatStops = (stops: ServiceStops): Stops => {
    return flattenStops(stops).filter(
        (stop, index, self) => index === self.findIndex((t) => t.atcoCode === stop.atcoCode),
    );
};
