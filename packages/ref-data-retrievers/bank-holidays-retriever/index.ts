import { logger } from "@baselime/lambda-logger";
import axios from "axios";
import { putS3Object } from "./s3";

export const getBankHolidaysAndUploadToS3 = async (bankHolidaysBucketName: string) => {
    const url = "https://www.gov.uk/bank-holidays.json";
    const response = await axios.get<object>(url, { responseType: "json" });

    if (!response.data || Object.keys(response.data).length === 0) {
        throw new Error(`Did not recieve any data from bank holidays url: ${url}`);
    }

    await putS3Object({
        Bucket: bankHolidaysBucketName,
        Key: "bank-holidays.json",
        ContentType: "application/json",
        Body: JSON.stringify(response.data),
    });
};

export const main = async () => {
    const { BANK_HOLIDAYS_BUCKET_NAME: bankHolidaysBucketName } = process.env;

    if (!bankHolidaysBucketName) {
        throw new Error("Missing env vars - BANK_HOLIDAYS_BUCKET_NAME must be set");
    }

    try {
        logger.info("Starting retrieval of bank holidays data");

        await getBankHolidaysAndUploadToS3(bankHolidaysBucketName);

        logger.info("Bank Holidays retrieval complete");
    } catch (e) {
        if (e instanceof Error) {
            logger.error("There was an error retrieving Bank Holidays data", e);
        }

        throw e;
    }
};
