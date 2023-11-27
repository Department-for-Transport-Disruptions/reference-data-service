import { Kysely } from "kysely";
import { Database, RoadworksTable } from "@reference-data-service/core/db";
import { Roadwork, roadworkSchema } from "@reference-data-service/api/utils/roadworkTypes.zod";

export async function getRoadworkByPermitReferenceNumber(permitReferenceNumber: string, dbClient: Kysely<Database>) {
    return await dbClient
        .selectFrom("roadworks")
        .where("permitReferenceNumber", "=", permitReferenceNumber)
        .selectAll()
        .executeTakeFirst();

    // const parsedRoadworks = roadworkSchema.safeParse(roadworks);
    // if (!parsedRoadworks.success) {
    //     return {};
    // }
    // return parsedRoadworks.data;
}

export const writeToRoadworksTable = async (roadwork: RoadworksTable, dbClient: Kysely<Database>) => {
    await dbClient.insertInto("roadworks").values(roadwork).execute();
};

export const updateToRoadworksTable = async (roadwork: RoadworksTable, dbClient: Kysely<Database>) => {
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
