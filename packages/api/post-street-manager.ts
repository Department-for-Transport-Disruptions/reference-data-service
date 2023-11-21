import { APIGatewayEvent } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as logger from "lambda-log";
import { snsMessageSchema } from "./utils/snsMesssageTypes.zod";
import { confirmSubscription, isValidSignature } from "./utils/snsMessageValidator";

const allowedTopicArns = ["arn:aws:sns:eu-west-2:287813576808:prod-permit-topic"];

const s3Client = new S3Client({ region: "eu-west-2" });

export const uploadToS3 = async (
    s3Client: S3Client,
    data: string,
    keyName: string,
    bucketName: string | undefined,
    contentType = "application/json",
) => {
    if (!bucketName) {
        throw Error("No bucket name provided");
    }

    const putCommand: PutObjectCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: keyName,
        Body: data,
        ContentType: contentType,
    });

    await s3Client.send(putCommand);
    logger.info(`Successfully uploaded data to ${bucketName}/${keyName}`);
};

export const main = async (event: APIGatewayEvent) => {
    if (!event.headers?.["x-amz-sns-message-type"]) {
        logger.error("Invalid headers on request");
        return;
    }

    const parsedBody = snsMessageSchema.safeParse(JSON.parse(event.body ?? ""));
    if (!parsedBody.success) {
        logger.error(JSON.stringify(parsedBody.error));
        return;
    }

    const snsMessage = parsedBody.data;

    if (!(await isValidSignature(snsMessage))) {
        logger.error("Invalid signature provided");
        return;
    }

    if (!allowedTopicArns.includes(snsMessage.TopicArn)) {
        logger.error("Invalid topic ARN provided in SNS Message");
        return;
    }

    if (snsMessage.Type === "SubscriptionConfirmation") {
        const subscribeUrl = snsMessage.SubscribeURL ?? "";
        await confirmSubscription(subscribeUrl);
    } else if (snsMessage.Type === "Notification") {
        const currentTime = new Date();

        const { STREET_MANAGER_BUCKET_NAME: streetManagerBucketName } = process.env;

        await uploadToS3(
            s3Client,
            snsMessage.Message,
            `${new Date(currentTime).valueOf()}-street-manager-data.json`,
            streetManagerBucketName,
            "application/json",
        );
    }
};
