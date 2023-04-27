import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { formatService, getQueryInput } from "./get-service-by-id";
import { serviceDbData } from "./test/testdata";

describe("get-service-by-id", () => {
    describe("input generation", () => {
        it("handles nocCode and serviceId", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                    serviceId: "234",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ nocCode: "TEST", serviceId: 234 });
        });

        it("throws a ClientError if no nocCode provided", () => {
            const event = {
                pathParameters: {
                    serviceId: "234",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("NOC must be provided");
        });

        it("throws a ClientError if no serviceId provided", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Service ID must be provided");
        });

        it("throws a ClientError if invalid serviceId provided", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                    serviceId: "abc",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Provided service ID is not valid");
        });
    });

    describe("format service", () => {
        it("correctly formats db response", async () => {
            const formattedService = await formatService(serviceDbData);

            expect(formattedService).toMatchSnapshot();
        });
    });
});
