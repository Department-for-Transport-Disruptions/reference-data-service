import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { getQueryInput } from "./get-services-for-operator";

describe("get-services-for-operator", () => {
    describe("input generation", () => {
        it("handles nocCode", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ nocCode: "TEST", dataSource: "bods" });
        });

        it("handles modes", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                },
                queryStringParameters: {
                    modes: "bus,tram",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ nocCode: "TEST", modes: ["bus", "tram"], dataSource: "bods" });
        });

        it("handles modes with trailing or leading spaces", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                },
                queryStringParameters: {
                    modes: " bus     , tram",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ nocCode: "TEST", modes: ["bus", "tram"], dataSource: "bods" });
        });

        it("handles dataSource", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                },
                queryStringParameters: {
                    dataSource: "tnds",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ nocCode: "TEST", dataSource: "tnds" });
        });

        it("throws a ClientError if no nocCode provided", () => {
            const event = {
                queryStringParameters: {
                    dataSource: "tnds",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("NOC must be provided");
        });

        it("throws a ClientError if invalid dataSource provided", () => {
            const event = {
                pathParameters: {
                    nocCode: "TEST",
                },
                queryStringParameters: {
                    dataSource: "1234",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Provided dataSource must be tnds or bods");
        });
    });
});
