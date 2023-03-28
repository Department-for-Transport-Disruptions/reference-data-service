import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { formatStops, getQueryInput } from "./get-service-stops";
import { stopsDbData } from "./test/testdata";

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
    });

    describe("format service", () => {
        it("correctly formats db response", () => {
            const formattedService = formatStops(stopsDbData);

            expect(formattedService).toMatchSnapshot();
        });
    });
});
