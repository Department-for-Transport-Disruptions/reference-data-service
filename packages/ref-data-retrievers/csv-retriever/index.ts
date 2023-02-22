import AdmZip from "adm-zip";
import axios from "axios";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as logger from "lambda-log";
import { randomUUID } from "crypto";

const s3Client = new S3Client({ region: "eu-west-2" });

export const main = async () => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    try {
        const {
            DATA_URL: dataUrl,
            CONTENT_TYPE: contentType,
            BUCKET_NAME: bucketName,
            TARGET_FILE: targetFile,
        } = process.env;

        if (!dataUrl || !contentType || !bucketName) {
            throw new Error("Missing env vars - DATA_URL, CONTENT_TYPE and BUCKET_NAME must be set");
        }

        logger.info(`Starting CSV Retriever`);

        const response = await axios.get(dataUrl, {
            responseType: "arraybuffer",
        });

        const contentDisposition = response.headers["content-disposition"] as string;
        const match = contentDisposition.match(/filename\s*=\s*(.+)/i);
        const filename: string = match?.[1] ?? "";

        if (filename.endsWith(".zip")) {
            logger.info("File retrieved is a ZIP file, unzipping...");

            const zip = new AdmZip(response.data as string);

            for (const entry of zip.getEntries()) {
                if ((targetFile && entry.entryName === targetFile) || !targetFile) {
                    await s3Client.send(
                        new PutObjectCommand({
                            Bucket: bucketName,
                            Key: entry.entryName,
                            ContentType: contentType,
                            Body: entry.getData(),
                        }),
                    );
                }
            }
        } else {
            if (!targetFile) {
                throw new Error("No TARGET_FILE set");
            }

            if (!filename) {
                throw new Error("No filename found");
            }

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: targetFile,
                    ContentType: contentType,
                    Body: response.data as string,
                }),
            );
        }
    } catch (e) {
        if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the csv retriever",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the csv retriever",
            }),
        };
    }
};
