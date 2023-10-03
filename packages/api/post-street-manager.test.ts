import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import * as snsMessageValidator from "./utils/snsMessageValidator";
import { main } from "./post-street-manager";
import { APIGatewayEvent } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Mockdate from "mockdate";

const mockSnsEvent = {
    headers: {
        "x-amz-sns-message-type": "Notification",
    },
    body:
        "{\n" +
        '  "Type" : "Notification",\n' +
        '  "MessageId" : "1234",\n' +
        '  "TopicArn" : "arn:aws:sns:eu-west-2:287813576808:prod-activity-topic",\n' +
        '  "Message" : "{\\n  \\"event_reference\\": 529771,\\n  \\"event_type\\": \\"ACTIVITY_CREATED\\",\\n  \\"object_data\\": {\\n    \\"activity_reference_number\\": \\"ARN-5990-85775436\\",\\n    \\"usrn\\": \\"8401426\\",\\n    \\"street_name\\": \\"Fake Street\\",\\n    \\"town\\": \\"London\\",\\n    \\"area_name\\": \\"MARYLEBONE HIGH STREET\\",\\n    \\"road_category\\": \\"4\\",\\n    \\"activity_coordinates\\": \\"LINESTRING(501251.53 222574.64,501305.92 222506.65)\\",\\n    \\"activity_name\\": \\"London Marathon\\",\\n    \\"activity_type\\": \\"event\\",\\n    \\"activity_type_details\\": \\"Activity type details\\",\\n    \\"start_date\\": \\"2020-06-10T00:00:00.000Z\\",\\n    \\"start_time\\": \\"2020-06-10T14:30:00.000Z\\",\\n    \\"end_date\\": \\"2020-06-11T00:00:00.000Z\\",\\n    \\"end_time\\": \\"2020-06-11T09:00:00.000Z\\",\\n    \\"activity_location_type\\": \\"Cycleway, Footpath\\",\\n    \\"activity_location_description\\": \\"Description of activity location\\",\\n    \\"traffic_management_type\\": \\"road_closure\\",\\n    \\"traffic_management_required\\": \\"Yes\\",\\n    \\"collaborative_working\\": \\"Yes\\"\\n    \\"cancelled\\": \\"Yes\\"\\n    \\"highway_authority\\": \\"CITY OF WESTMINSTER\\",\\n    \\"highway_authority_swa_code\\": \\"5990\\",\\n  },\\n  \\"event_time\\": \\"2020-06-04T08:00:00.000Z\\",\\n  \\"object_type\\": \\"ACTIVITY\\",\\n  \\"object_reference\\": \\"ARN-5990-85775436\\",\\n  \\"version\\": 1\\n}",\n' +
        '  "Timestamp" : "2023-10-02T14:22:45.889Z",\n' +
        '  "SignatureVersion" : "1",\n' +
        '  "Signature" : "test-signature",\n' +
        '  "SigningCertURL" : "https://www.testurl.com",\n' +
        '  "UnsubscribeURL" : "https://wwww.testurl.com"\n' +
        "}",
} as unknown as APIGatewayEvent;

const s3Mock = mockClient(S3Client);
const isValidSignatureSpy = vi.spyOn(snsMessageValidator, "isValidSignature");
const confirmSubscriptionSpy = vi.spyOn(snsMessageValidator, "confirmSubscription");

describe("post-street-manager", () => {
    beforeAll(() => {
        process.env.STREET_MANAGER_BUCKET_NAME = "test-bucket";
    });

    Mockdate.set("2023-08-17");

    beforeEach(() => {
        isValidSignatureSpy.mockResolvedValue(true);
    });

    afterEach(() => {
        s3Mock.reset();
    });

    it("should copy the validated SNS message body to S3 if request is of type Notification", async () => {
        await main(mockSnsEvent);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const expected = JSON.parse(mockSnsEvent.body ?? "").Message;

        expect(s3Mock.send.calledOnce).toBeTruthy();
        expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.Bucket).toEqual("test-bucket");
        expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.Key).toEqual(
            "1692230400000-street-manager-data.json",
        );
        expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.Body).toEqual(expected);
    });
    it("should confirm subscription to SNS topic request is of type SubscriptionConfirmation", async () => {
        confirmSubscriptionSpy.mockResolvedValue(undefined);
        const mockSnsEventSubscription = {
            ...mockSnsEvent,
            body:
                "{\n" +
                '  "Type" : "SubscriptionConfirmation",\n' +
                '  "MessageId" : "1234",\n' +
                '  "TopicArn" : "arn:aws:sns:eu-west-2:287813576808:prod-activity-topic",\n' +
                '  "Message" : "You have chosen to subscribe to the topic. To confirm the subscription, visit the SubscribeURL included in this message.",\n' +
                '  "Timestamp" : "2023-10-02T14:22:45.889Z",\n' +
                '  "SignatureVersion" : "1",\n' +
                '  "Signature" : "BsfYwpxepfGgbkuHkbFj1sTxnpJdPpwYooE6DrEPVoMTWuvklgXEntUOHQR3ZbQBebT1mTC2LKUaspvO6VWc90TaqTbHSCAK5FK8MXh9VO/rLbl9QCECOpJlxki/tjQN7wdx66cwove3N5wrWd1QyiR0gLytLSsfzQroLdYt0AeIk8IAON+3UAkIVPKqUEEzjIgM7WWkg5Bgi1YibRW4DeRo3r744pvVKP1S9mLweg8ZTgG2EV5yuTlcv17geciYKxyxMgI7CqfkMWsvNWKwGP3pe5uUsREclhSjunnax+1tHQBNWQXPohMmmnvJH519ACrIXBG9joQQqCDRJ2PvUA==",\n' +
                '  "SigningCertURL" : "https://www.testurl.com",\n' +
                '  "SubscribeURL" : "https://www.testurl.com"\n' +
                "}",
        };
        await main(mockSnsEventSubscription);
        expect(confirmSubscriptionSpy).toBeCalled();
        expect(confirmSubscriptionSpy).toBeCalledWith("https://www.testurl.com");
    });
    it("should error if request does not have the correct SNS header", async () => {
        const mockSnsEventNoHeader = {
            ...mockSnsEvent,
            headers: {
                ...mockSnsEvent.headers,
                "x-amz-sns-message-type": undefined,
            },
        };
        await main(mockSnsEventNoHeader);
        expect(s3Mock.send.calledOnce).toBeFalsy();
    });
    it("should error if request body does not match the SNS message schema  ", async () => {
        const mockSnsEventNoHeader = {
            ...mockSnsEvent,
            body:
                "{\n" +
                '  "Message" : "Notification",\n' +
                '  "MessageId" : "1234",\n' +
                '  "Message" : "{\\n  \\"event_reference\\": 529771,\\n  \\"event_type\\": \\"ACTIVITY_CREATED\\",\\n  \\"object_data\\": {\\n    \\"activity_reference_number\\": \\"ARN-5990-85775436\\",\\n    \\"usrn\\": \\"8401426\\",\\n    \\"street_name\\": \\"Fake Street\\",\\n    \\"town\\": \\"London\\",\\n    \\"area_name\\": \\"MARYLEBONE HIGH STREET\\",\\n    \\"road_category\\": \\"4\\",\\n    \\"activity_coordinates\\": \\"LINESTRING(501251.53 222574.64,501305.92 222506.65)\\",\\n    \\"activity_name\\": \\"London Marathon\\",\\n    \\"activity_type\\": \\"event\\",\\n    \\"activity_type_details\\": \\"Activity type details\\",\\n    \\"start_date\\": \\"2020-06-10T00:00:00.000Z\\",\\n    \\"start_time\\": \\"2020-06-10T14:30:00.000Z\\",\\n    \\"end_date\\": \\"2020-06-11T00:00:00.000Z\\",\\n    \\"end_time\\": \\"2020-06-11T09:00:00.000Z\\",\\n    \\"activity_location_type\\": \\"Cycleway, Footpath\\",\\n    \\"activity_location_description\\": \\"Description of activity location\\",\\n    \\"traffic_management_type\\": \\"road_closure\\",\\n    \\"traffic_management_required\\": \\"Yes\\",\\n    \\"collaborative_working\\": \\"Yes\\"\\n    \\"cancelled\\": \\"Yes\\"\\n    \\"highway_authority\\": \\"CITY OF WESTMINSTER\\",\\n    \\"highway_authority_swa_code\\": \\"5990\\",\\n  },\\n  \\"event_time\\": \\"2020-06-04T08:00:00.000Z\\",\\n  \\"object_type\\": \\"ACTIVITY\\",\\n  \\"object_reference\\": \\"ARN-5990-85775436\\",\\n  \\"version\\": 1\\n}",\n' +
                '  "Timestamp" : "2023-10-02T14:22:45.889Z",\n' +
                '  "SignatureVersion" : "1",\n' +
                '  "Signature" : "test-signature",\n' +
                '  "SigningCertURL" : "https://www.testurl.com",\n' +
                '  "UnsubscribeURL" : "https://wwww.testurl.com"\n' +
                "}",
        };
        await main(mockSnsEventNoHeader);
        expect(s3Mock.send.calledOnce).toBeFalsy();
    });
    it("should error if an invalid signing certificate is provided", async () => {
        isValidSignatureSpy.mockResolvedValue(false);
        await main(mockSnsEvent);
        expect(s3Mock.send.calledOnce).toBeFalsy();
    });
    it("should error if an invalid topic arn is provided", async () => {
        const mockSnsEventInvalidArn = {
            ...mockSnsEvent,
            body:
                "{\n" +
                '  "Type" : "Notification",\n' +
                '  "MessageId" : "1234",\n' +
                '  "TopicArn" : "wrong arn",\n' +
                '  "Message" : "{\\n  \\"event_reference\\": 529771,\\n  \\"event_type\\": \\"ACTIVITY_CREATED\\",\\n  \\"object_data\\": {\\n    \\"activity_reference_number\\": \\"ARN-5990-85775436\\",\\n    \\"usrn\\": \\"8401426\\",\\n    \\"street_name\\": \\"Fake Street\\",\\n    \\"town\\": \\"London\\",\\n    \\"area_name\\": \\"MARYLEBONE HIGH STREET\\",\\n    \\"road_category\\": \\"4\\",\\n    \\"activity_coordinates\\": \\"LINESTRING(501251.53 222574.64,501305.92 222506.65)\\",\\n    \\"activity_name\\": \\"London Marathon\\",\\n    \\"activity_type\\": \\"event\\",\\n    \\"activity_type_details\\": \\"Activity type details\\",\\n    \\"start_date\\": \\"2020-06-10T00:00:00.000Z\\",\\n    \\"start_time\\": \\"2020-06-10T14:30:00.000Z\\",\\n    \\"end_date\\": \\"2020-06-11T00:00:00.000Z\\",\\n    \\"end_time\\": \\"2020-06-11T09:00:00.000Z\\",\\n    \\"activity_location_type\\": \\"Cycleway, Footpath\\",\\n    \\"activity_location_description\\": \\"Description of activity location\\",\\n    \\"traffic_management_type\\": \\"road_closure\\",\\n    \\"traffic_management_required\\": \\"Yes\\",\\n    \\"collaborative_working\\": \\"Yes\\"\\n    \\"cancelled\\": \\"Yes\\"\\n    \\"highway_authority\\": \\"CITY OF WESTMINSTER\\",\\n    \\"highway_authority_swa_code\\": \\"5990\\",\\n  },\\n  \\"event_time\\": \\"2020-06-04T08:00:00.000Z\\",\\n  \\"object_type\\": \\"ACTIVITY\\",\\n  \\"object_reference\\": \\"ARN-5990-85775436\\",\\n  \\"version\\": 1\\n}",\n' +
                '  "Timestamp" : "2023-10-02T14:22:45.889Z",\n' +
                '  "SignatureVersion" : "1",\n' +
                '  "Signature" : "test-signature",\n' +
                '  "SigningCertURL" : "https://www.testurl.com",\n' +
                '  "UnsubscribeURL" : "https://wwww.testurl.com"\n' +
                "}",
        };
        await main(mockSnsEventInvalidArn);
        expect(s3Mock.send.calledOnce).toBeFalsy();
    });
});
