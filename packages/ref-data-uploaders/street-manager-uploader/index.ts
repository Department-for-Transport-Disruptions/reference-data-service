import { SQSEvent } from "aws-lambda";
import { PermitMessage, Roadwork, roadworkSchema } from "@reference-data-service/api/utils/snsMesssageTypes.zod";
import * as logger from "lambda-log";
import { Database, getDbClient, RoadworksTable } from "@reference-data-service/core/db";
import { Kysely, sql } from "kysely";

async function getRoadworkByPermitReferenceNumber(permitReferenceNumber: string, dbClient: Kysely<Database>) {
    return await dbClient
        .selectFrom("roadworks")
        .where("permitReferenceNumber", "=", permitReferenceNumber)
        .selectAll()
        .executeTakeFirst();
}

const writeToRoadworksTable = async (roadwork: RoadworksTable, dbClient: Kysely<Database>) => {
    await dbClient.insertInto("roadworks").values(roadwork).execute();
};

const updateToRoadworksTable = async (roadwork: RoadworksTable, dbClient: Kysely<Database>) => {
    await dbClient
        .updateTable("roadworks")
        .set({
            highwayAuthority: roadwork.highwayAuthority,
            highwayAuthoritySwaCode: roadwork.highwayAuthoritySwaCode,
            worksLocationCoordinates: roadwork.worksLocationCoordinates,
            streetName: roadwork.streetName,
            areaName: roadwork.areaName,
            workCategory: roadwork.workCategory,
            trafficManagementType: roadwork.trafficManagementType,
            proposedStartDateTime: roadwork.proposedStartDateTime,
            proposedEndDateTime: roadwork.proposedEndDateTime,
            actualStartDateTime: roadwork.actualStartDateTime,
            actualEndDateTime: roadwork.actualEndDateTime,
            workStatus: roadwork.workStatus,
            usrn: roadwork.usrn,
            activityType: roadwork.activityType,
            worksLocationType: roadwork.worksLocationType,
            isTrafficSensitive: roadwork.isTrafficSensitive,
            permitStatus: roadwork.permitStatus,
            town: roadwork.town,
            currentTrafficManagementType: roadwork.currentTrafficManagementType,
            currentTrafficManagementTypeUpdateDate: roadwork.currentTrafficManagementTypeUpdateDate,
            createdDateTime: roadwork.createdDateTime,
            lastUpdatedDateTime: roadwork.lastUpdatedDateTime,
        })
        .where("permitReferenceNumber", "=", roadwork.permitReferenceNumber)
        .execute();
};

export const main = async (event: SQSEvent) => {
    const currentDateTime = new Date();
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
