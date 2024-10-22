import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { BusStopType, DataSource, ServiceStop, ServiceTracks, VehicleMode } from "./client";
import { formatStopsRoutes, getQueryInput } from "./get-service-routes";
import { stopsDbData } from "./test/testdata";

describe("get-service-routes", () => {
    describe("input generation", () => {
        it("handles serviceId", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                    useTracks: true,
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ serviceRef: "234", useTracks: true, dataSource: DataSource.bods });
        });

        it("handles serviceCode or lineId with datasource", () => {
            const event = {
                pathParameters: {
                    serviceId: "abc",
                },
                queryStringParameters: {
                    dataSource: "bods",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ dataSource: "bods", serviceRef: "abc", useTracks: true });
        });

        it("defaults to bods if no datasource provided", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                    stopTypes: "BCT",
                    busStopTypes: BusStopType.MKD,
                    modes: VehicleMode.bus,
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                serviceRef: "234",
                stopTypes: ["BCT"],
                busStopTypes: [BusStopType.MKD],
                modes: [VehicleMode.bus],
                dataSource: DataSource.bods,
                useTracks: true,
            });
        });

        it("throws a ClientError if no serviceId provided", () => {
            const event = {
                pathParameters: {},
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Service Ref must be provided");
        });

        it("handles serviceId, stopTypes, busStopType and modes", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                    stopTypes: "BCT",
                    busStopTypes: BusStopType.MKD,
                    modes: VehicleMode.bus,
                    useTracks: true,
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                serviceRef: "234",
                stopTypes: ["BCT"],
                busStopTypes: [BusStopType.MKD],
                modes: [VehicleMode.bus],
                useTracks: true,
                dataSource: DataSource.bods,
            });
        });

        it("throws a ClientError if invalid busStopType provided", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                    busStopTypes: "invalid",
                    useTracks: true,
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Invalid bus stop type provided");
        });
    });

    describe("format service", () => {
        it("correctly formats db response", async () => {
            const formattedService: { outbound: ServiceStop[] | ServiceTracks; inbound: ServiceStop[] } =
                await formatStopsRoutes(stopsDbData);

            expect(formattedService).toMatchSnapshot();
        });
    });
});
