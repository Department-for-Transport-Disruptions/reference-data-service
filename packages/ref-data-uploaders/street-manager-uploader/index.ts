import { SQSEvent } from "aws-lambda";
import { roadworkSchema } from "@reference-data-service/api/utils/snsMesssageTypes.zod";
import * as logger from "lambda-log";
import { getDbClient } from "@reference-data-service/core/db";
import { getRoadworkByPermitReferenceNumber, updateToRoadworksTable, writeToRoadworksTable } from "./utils";

const dbClient = getDbClient();

export const main = async (event: SQSEvent) => {
    const currentDateTime = new Date();

    const roadwork = roadworkSchema.safeParse(JSON.parse(event.Records[0].body));

    if (!roadwork.success) {
        logger.error(
            `Failed to parse message sent from SQS queue, messageId: ${
                event.Records[0].messageId
            }, ${roadwork.error.toString()}`,
        );
        return;
    }

    logger.info(`Checking if permit: ${roadwork.data.permitReferenceNumber} already exists in database`);

    const existingRoadwork = await getRoadworkByPermitReferenceNumber(roadwork.data.permitReferenceNumber, dbClient);

    if (!!existingRoadwork?.permitReferenceNumber) {
        logger.info(`Uploading update to permit: ${roadwork.data.permitReferenceNumber.toString()} to the database`);
        const roadworkDbInput = {
            ...existingRoadwork,
            ...roadwork.data,
        };

        await updateToRoadworksTable(roadworkDbInput, dbClient);
    } else {
        logger.info(`Uploading new permit: ${roadwork.data.permitReferenceNumber} to the database`);

        const roadworkDbInput = {
            ...roadwork.data,
            createdDateTime: currentDateTime.toISOString(),
        };

        await writeToRoadworksTable(roadworkDbInput, dbClient);
    }
};
