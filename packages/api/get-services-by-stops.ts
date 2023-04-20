import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";

import {
    ServiceStop,
    ServiceStops,
    ServicesByStopsQueryInput,
    getServiceIdsByStops,
    getServicesStopsTest,
} from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";
import { flattenStops } from "./get-service-stops";
import { filterStops } from "./get-service-routes";

const MAX_ATCO_CODES = process.env.MAX_ATCO_CODES || "5";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceIdsByStops, flattenIds, getServicesStopsTest, formatServicesStops);

export const getQueryInput = (event: APIGatewayEvent): ServicesByStopsQueryInput => {
    const { queryStringParameters } = event;

    const atcoCodes = queryStringParameters?.atcoCodes ?? "";
    const atcoCodesArray = atcoCodes
        .split(",")
        .filter((atcoCode) => atcoCode)
        .map((atcoCode) => atcoCode.trim());

    if (!atcoCodes) {
        throw new ClientError(`ATCO codes must be provided`);
    }

    if (atcoCodesArray.length > Number(MAX_ATCO_CODES)) {
        throw new ClientError(`Only up to ${MAX_ATCO_CODES} ATCO codes can be provided`);
    }

    return {
        atcoCodes: atcoCodesArray,
    };
};

const flattenIds = (serviceIds: { id: number }[]): number[] => {
    return serviceIds.map((serviceId) => serviceId.id);
};

const formatServicesStops = (stopsAndIds: {
    stops: ServiceStops;
    serviceIds: number[];
}): { outbound: ServiceStop[]; inbound: ServiceStop[]; serviceId: number }[] => {
    const flattenedStops = flattenStops(stopsAndIds.stops);

    const filteredServices = stopsAndIds.serviceIds.map((id) => {
        const service = flattenedStops.filter((item) => item.serviceId === id);
        const outbound = filterStops(service, "outbound");
        const inbound = filterStops(service, "inbound");
        return { outbound, inbound, serviceId: id };
    });

    return filteredServices;
};
