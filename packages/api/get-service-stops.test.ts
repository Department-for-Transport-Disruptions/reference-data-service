import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { formatStops, getQueryInput } from "./get-service-stops";
import { stopsDbData } from "./test/testdata";
import { VehicleMode, BusStopType } from "./client";

describe("get-service-stops", () => {
    describe("input generation", () => {
        it("handles serviceId", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ serviceId: 234 });
        });

        it("handles serviceId, stopTypes, busStopType and modes", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                    stopTypes: "BCT",
                    busStopTypes: BusStopType.MKD,
                    modes: VehicleMode.bus,
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                serviceId: 234,
                stopTypes: ["BCT"],
                busStopTypes: [BusStopType.MKD],
                modes: [VehicleMode.bus],
            });
        });

        it("throws a ClientError if no serviceId provided", () => {
            const event = {
                pathParameters: {},
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Service ID must be provided");
        });

        it("throws a ClientError if invalid serviceId provided", () => {
            const event = {
                pathParameters: {
                    serviceId: "abc",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Provided service ID is not valid");
        });
        it("throws a ClientError if invalid busStopType provided", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                    busStopTypes: "invalid",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Invalid bus stop type provided");
        });
    });

    describe("format service", () => {
        it("correctly formats db response", async () => {
            const formattedService = await formatStops(stopsDbData);

            expect(formattedService).toMatchSnapshot();
        });
    });
});
