import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./index";
import * as utils from "./utils";

const sqsMessage = {
    permitReferenceNumber: "TSR1591199404915-01",
    highwayAuthority: "CITY OF WESTMINSTER",
    highwayAuthoritySwaCode: 5990,
    worksLocationCoordinates: "LINESTRING(501251.53 222574.64,501305.92 222506.65)",
    streetName: "HIGH STREET NORTH",
    areaName: "LONDON",
    workCategory: "Standard",
    trafficManagementType: "Road closure",
    proposedStartDateTime: "2020-06-10T00:00:00.000Z",
    proposedEndDateTime: "2020-06-12T00:00:00.000Z",
    actualStartDateTime: null,
    actualEndDateTime: null,
    workStatus: "Works in progress",
    usrn: "8401426",
    activityType: "Remedial works",
    worksLocationType: "Cycleway, Footpath",
    isTrafficSensitive: "Yes",
    permitStatus: "permit_modification_request",
    town: "LONDON",
    currentTrafficManagementType: "Multi-way signals",
    currentTrafficManagementTypeUpdateDate: null,
    lastUpdatedDateTime: "2020-06-04T08:00:00.000Z",
};

export const mockSqsEvent = {
    Records: [
        {
            messageId: "id",
            receiptHandle: "test",
            body: JSON.stringify(sqsMessage),
            md5OfBody: "test",
            eventSource: "test",
            eventSourceARN: "test",
            awsRegion: "test",
            attributes: {
                ApproximateReceiveCount: "test",
                SentTimestamp: "test",
                SenderId: "test",
                ApproximateFirstReceiveTimestamp: "test",
            },
            messageAttributes: {
                message: { dataType: "String" },
            },
        },
    ],
};

describe("street manager uploader", () => {
    beforeAll(() => {
        process.env.DATABASE_NAME = "test name";
        process.env.DATABASE_SECRET_ARN = "test arn";
        process.env.DATABASE_RESOURCE_ARN = "cluster arn";
    });

    vi.mock("./utils", () => ({
        getRoadworkByPermitReferenceNumber: vi.fn(),
        writeToRoadworksTable: vi.fn(),
        updateToRoadworksTable: vi.fn(),
    }));

    const getRoadworksByPermitReferenceNumberSpy = vi.spyOn(utils, "getRoadworkByPermitReferenceNumber");
    const writeToRoadworksTableSpy = vi.spyOn(utils, "writeToRoadworksTable");
    const updateToRoadworksTableSpy = vi.spyOn(utils, "updateToRoadworksTable");

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("should error if SQS event message does not match roadwork schema", async () => {
        await main(mockSqsEvent);
        expect(writeToRoadworksTableSpy).not.toBeCalled();
        expect(updateToRoadworksTableSpy).not.toBeCalled();
    });

    it("should add a new roadwork entry to the database if a roadwork with the same permit reference number doesn't exist already", async () => {
        getRoadworksByPermitReferenceNumberSpy.mockResolvedValue(undefined);

        await main(mockSqsEvent);

        expect(writeToRoadworksTableSpy).toBeCalled();
        expect(updateToRoadworksTableSpy).not.toBeCalled();
    });

    it("should update a roadwork entry in the database with the SQS message if a roadwork with the same permit reference number exists already", async () => {
        getRoadworksByPermitReferenceNumberSpy.mockResolvedValue({
            permitReferenceNumber: "TSR1591199404915-01",
            highwayAuthority: "CITY OF WESTMINSTER",
            highwayAuthoritySwaCode: 5990,
            worksLocationCoordinates: "LINESTRING(501251.53 222574.64,501305.92 222506.65)",
            streetName: "HIGH STREET NORTH",
            areaName: "LONDON",
            workCategory: "Standard",
            trafficManagementType: "Road closure",
            proposedStartDateTime: "2020-06-10T00:00:00.000Z",
            proposedEndDateTime: "2020-06-12T00:00:00.000Z",
            actualStartDateTime: null,
            actualEndDateTime: null,
            workStatus: "Works in progress",
            usrn: "8401426",
            activityType: "Remedial works",
            worksLocationType: "Cycleway, Footpath",
            isTrafficSensitive: "Yes",
            permitStatus: "permit_modification_request",
            town: "LONDON",
            currentTrafficManagementType: "Road closure",
            currentTrafficManagementTypeUpdateDate: null,
            lastUpdatedDateTime: "2020-06-04T08:00:00.000Z",
            createdDateTime: "2020-06-01T08:00:00.000Z",
        });

        await main(mockSqsEvent);

        expect(writeToRoadworksTableSpy).not.toBeCalled();
        expect(updateToRoadworksTableSpy).toBeCalled();
    });
});
