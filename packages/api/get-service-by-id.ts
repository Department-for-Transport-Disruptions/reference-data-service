import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getServiceById, isDataSource, Service, ServiceByIdQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

type Stop = {
    naptanCode: string | null;
    atcoCode: string | null;
    commonName: string | null;
    nptgLocalityCode: string | null;
    localityName: string | null;
    parentLocalityName: string | null;
    indicator: string | null;
    street: string | null;
    latitude: string | null;
    longitude: string | null;
};

type ServiceResponse = {
    serviceId: number;
    nocCode: string | null;
    lineName: string | null;
    lineId: string | null;
    startDate: string | null;
    endDate: string | null;
    operatorShortName: string | null;
    serviceDescription: string | null;
    serviceCode: string | null;
    regionCode: string | null;
    dataSource: string;
    origin: string | null;
    destination: string | null;
    inboundDirectionDescription: string | null;
    outboundDirectionDescription: string | null;
    mode: string | null;
    centrePointLat: string | null;
    centrePointLon: string | null;
    journeyPatterns: {
        id: number;
        direction: string | null;
        destinationDisplay: string | null;
        links: {
            fromTimingStatus: string | null;
            toTimingStatus: string | null;
            orderInSequence: number | null;
            fromSequenceNumber: string | null;
            toSequenceNumber: string | null;
            runtime: string | null;
            fromStop: Stop;
            toStop: Stop;
        }[];
    }[];
};

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getServiceById, formatService);

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
        dataSource: dataSourceInput && isDataSource(dataSourceInput) ? dataSourceInput : "bods",
    };
};

// eslint-disable-next-line @typescript-eslint/require-await
export const formatService = async (service: Service): Promise<ServiceResponse | null> => {
    return (
        service?.reduce<ServiceResponse>(
            (p, c) => {
                const { journeyPatterns } = p;

                const existingJourneyPattern = journeyPatterns.find((pattern) => pattern.id === c.journeyPatternId);
                const link = {
                    fromStop: {
                        atcoCode: c.fromAtcoCode,
                        naptanCode: c.fromNaptanCode,
                        commonName: c.fromCommonName,
                        nptgLocalityCode: c.fromNptgLocalityCode,
                        localityName: c.fromLocalityName,
                        parentLocalityName: c.fromParentLocalityName,
                        indicator: c.fromIndicator,
                        street: c.fromStreet,
                        latitude: c.fromLatitude,
                        longitude: c.fromLongitude,
                    },
                    toStop: {
                        atcoCode: c.toAtcoCode,
                        naptanCode: c.toNaptanCode,
                        commonName: c.toCommonName,
                        nptgLocalityCode: c.toNptgLocalityCode,
                        localityName: c.toLocalityName,
                        parentLocalityName: c.toParentLocalityName,
                        indicator: c.toIndicator,
                        street: c.toStreet,
                        latitude: c.toLatitude,
                        longitude: c.toLongitude,
                    },
                    fromTimingStatus: c.fromTimingStatus,
                    toTimingStatus: c.toTimingStatus,
                    orderInSequence: c.orderInSequence,
                    fromSequenceNumber: c.fromSequenceNumber,
                    toSequenceNumber: c.toSequenceNumber,
                    runtime: c.runtime,
                };

                if (!existingJourneyPattern) {
                    journeyPatterns.push({
                        id: c.journeyPatternId,
                        destinationDisplay: c.destinationDisplay,
                        direction: c.direction,
                        links: [link],
                    });
                } else {
                    existingJourneyPattern.links.push(link);
                }

                return p;
            },
            {
                serviceId: service[0].id,
                nocCode: service[0].nocCode,
                lineName: service[0].lineName,
                lineId: service[0].lineId,
                startDate: service[0].startDate,
                endDate: service[0].endDate,
                operatorShortName: service[0].operatorShortName,
                serviceDescription: service[0].serviceDescription,
                serviceCode: service[0].serviceCode,
                regionCode: service[0].regionCode,
                dataSource: service[0].dataSource,
                origin: service[0].origin,
                destination: service[0].destination,
                inboundDirectionDescription: service[0].inboundDirectionDescription,
                outboundDirectionDescription: service[0].outboundDirectionDescription,
                mode: service[0].mode,
                centrePointLat: service[0].centrePointLat,
                centrePointLon: service[0].centrePointLon,
                journeyPatterns: [],
            },
        ) ?? null
    );
};
