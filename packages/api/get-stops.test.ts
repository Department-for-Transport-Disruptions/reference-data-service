import { APIGatewayEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { getQueryInput } from "./get-stops";

describe("get-stops", () => {
    describe("input generation", () => {
        it("handles atcoCodes", () => {
            const event = {
                queryStringParameters: {
                    atcoCodes: "test123,test456",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ atcoCodes: ["test123", "test456"], page: 0 });
        });

        it("handles naptanCodes", () => {
            const event = {
                queryStringParameters: {
                    naptanCodes: "abcde,fghij",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({ naptanCodes: ["abcde", "fghij"], page: 0 });
        });

        it("handles atcoCodes and naptanCodes", () => {
            const event = {
                queryStringParameters: {
                    atcoCodes: "test123,test456",
                    naptanCodes: "abcde,fghij",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                atcoCodes: ["test123", "test456"],
                naptanCodes: ["abcde", "fghij"],
                page: 0,
            });
        });

        it("handles atcoCodes and naptanCodes with trailing or leading spaces", () => {
            const event = {
                queryStringParameters: {
                    atcoCodes: " test123   ,  test456 ",
                    naptanCodes: "abcde , fghij",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                atcoCodes: ["test123", "test456"],
                naptanCodes: ["abcde", "fghij"],
                page: 0,
            });
        });

        it("handles page numbers", () => {
            const event = {
                queryStringParameters: {
                    page: "5",
                },
            } as unknown as APIGatewayEvent;

            expect(getQueryInput(event)).toEqual({
                page: 4,
            });
        });

        it("throws a ClientError for too many atcoCodes", () => {
            const event = {
                queryStringParameters: {
                    atcoCodes: "test123,test456,test789,test111,test222,test333",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Only up to 5 ATCO codes can be provided");
        });

        it("throws a ClientError for too many naptanCodes", () => {
            const event = {
                queryStringParameters: {
                    naptanCodes: "abcde,fghij,klmno,pqrst,uvwxy,zabcd",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Only up to 5 NaPTAN codes can be provided");
        });

        it("throws a ClientError for an invalid page number", () => {
            const event = {
                queryStringParameters: {
                    page: "abc",
                },
            } as unknown as APIGatewayEvent;

            expect(() => getQueryInput(event)).toThrowError("Provided page is not valid");
        });
    });
});
