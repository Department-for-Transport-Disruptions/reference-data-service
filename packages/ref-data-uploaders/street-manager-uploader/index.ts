import { roadworkSchema } from "@reference-data-service/api/utils/roadworkTypes.zod";
import { getDbClient } from "@reference-data-service/core/db";
import { SQSEvent } from "aws-lambda";
import * as logger from "lambda-log";
import { getRoadworkByPermitReferenceNumber, updateToRoadworksTable, writeToRoadworksTable } from "./utils";

export const main = async (event: SQSEvent) => {
    const dbClient = getDbClient();

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

    if (existingRoadwork) {
        logger.info(`Uploading update to permit: ${roadwork.data.permitReferenceNumber.toString()} to the database`);
        const roadworkDbInput = {
            ...existingRoadwork,
            ...roadwork.data,
            createdDateTime: existingRoadwork.createdDateTime,
        };

        await updateToRoadworksTable(roadworkDbInput, dbClient);
    } else {
        logger.info(`Uploading new permit: ${roadwork.data.permitReferenceNumber} to the database`);

        const roadworkDbInput = {
            ...roadwork.data,
            createdDateTime: roadwork.data.lastUpdatedDatetime,
        };

        await writeToRoadworksTable(roadworkDbInput, dbClient);
    }
};
