import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { getQueryInput } from "./get-services";

describe("get-services", () => {
    describe("input generation", () => {
        it("handles modes", () => {
            const event = {
                queryStringParameters: {
                    modes: "bus,tram",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ modes: ["bus", "tram"], dataSource: "bods", page: 0 });
        });

        it("handles modes with trailing or leading spaces", () => {
            const event = {
                queryStringParameters: {
                    modes: " bus     , tram",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ modes: ["bus", "tram"], dataSource: "bods", page: 0 });
        });

        it("handles dataSource", () => {
            const event = {
                queryStringParameters: {
                    dataSource: "tnds",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ dataSource: "tnds", page: 0 });
        });

        it("handles page numbers", () => {
            const event = {
                queryStringParameters: {
                    page: "8",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                dataSource: "bods",
                page: 7,
            });
        });

        it("handles adminAreaCode", () => {
            const event = {
                queryStringParameters: {
                    adminAreaCodes: "009,001",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ adminAreaCodes: ["009", "001"], dataSource: "bods", page: 0 });
        });

        it("throws a ClientError if invalid dataSource provided", () => {
            const event = {
                queryStringParameters: {
                    dataSource: "1234",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Provided dataSource must be tnds or bods");
        });

        it("throws a ClientError for an invalid page number", () => {
            const event = {
                queryStringParameters: {
                    page: "abc",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Provided page is not valid");
        });

        it("throws a ClientError for invalid mode", () => {
            const event = {
                queryStringParameters: {
                    modes: "bus,invalid",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Invalid mode provided");
        });
    });
});
