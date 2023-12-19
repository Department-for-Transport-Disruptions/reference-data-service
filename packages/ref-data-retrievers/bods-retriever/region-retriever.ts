import axios from "axios";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as logger from "lambda-log";
import { randomUUID } from "crypto";
import { putTableRenamerDisableParameter } from "@reference-data-service/core/ssm";
import { PassThrough, Stream } from "stream";

const s3Client = new S3Client({ region: "eu-west-2" });

export const main = async (event: Record<string, string>) => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    const {
        BASE_DATA_URL: dataUrl,
        TXC_BUCKET_NAME: txcBucketName,
        TXC_ZIPPED_BUCKET_NAME: txcZippedBucketName,
        STAGE: stage,
    } = process.env;

    if (!dataUrl || !txcBucketName || !txcZippedBucketName || !stage) {
        throw new Error(
            "Missing env vars - BASE_DATA_URL, TXC_BUCKET_NAME, TXC_ZIPPED_BUCKET_NAME and STAGE must be set",
        );
    }

    try {
        const { REGION_CODE: regionCode } = event;

        if (!regionCode) {
            throw new Error("REGION_CODE not set");
        }

        logger.info(`Starting BODS Region Retriever for region code ${regionCode}`);

        const response = await axios.get<Stream>(`${dataUrl}/${regionCode}`, {
            responseType: "stream",
        });

        const passThrough = new PassThrough();

        const upload = new Upload({
            client: s3Client,
            params: { Bucket: txcZippedBucketName, Key: `bods/${regionCode}.zip`, Body: passThrough },
            queueSize: 4,
            partSize: 1024 * 1024 * 5,
            leavePartsOnError: false,
        });

        response.data.pipe(passThrough);

        await upload.done();
    } catch (e) {
        await putTableRenamerDisableParameter(stage, "true", logger);

        if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the data retriever",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the data retriever",
            }),
        };
    }
};
