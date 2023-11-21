import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db){
    await db.schema
        .createTable("roadworks")
        .addColumn("permitReferenceNumber", "varchar(255)", col => col.primaryKey())
        .addColumn("highwayAuthority", "varchar(255)")
        .addColumn("highwayAuthoritySwaCode", "integer")
        .addColumn("worksLocationCoordinates", "varchar(255)")
        .addColumn("streetName", "varchar(255)")
        .addColumn("areaName", "varchar(255)")
        .addColumn("workCategory", "varchar(255)")
        .addColumn("trafficManagementType", "varchar(255)")
        .addColumn("proposedStartDateTime", "datetime")
        .addColumn("proposedEndDateTime", "datetime")
        .addColumn("actualStartDateTime", "datetime")
        .addColumn("actualEndDateTime", "datetime")
        .addColumn("workStatus", "varchar(255)")
        .addColumn("usrn", "varchar(255)")
        .addColumn("activityType", "varchar(255)")
        .addColumn("worksLocationType", "varchar(255)")
        .addColumn("isTrafficSensitive", "varchar(255)")
        .addColumn("permitStatus", "varchar(255)")
        .addColumn("town", "varchar(255)")
        .addColumn("currentTrafficManagementType", "varchar(255)")
        .addColumn("currentTrafficManagementTypeUpdateDate", "datetime")
        .addColumn("createdDateTime", "datetime")
        .addColumn("lastUpdatedDatetime", "datetime")
        .execute()

    await db.schema
        .createTable("highway_authority_admin_areas")
        .addColumn("highwayAuthoritySwaCode", "integer")
        .addColumn("administrativeAreaCode", "varchar(255)")
        .execute()

    await db.schema
        .createIndex("idx_administrativeAreaCode")
        .on("highway_authority_admin_areas")
        .column("administrativeAreaCode")
        .execute()

    await db.schema
        .createIndex("idx_highwayAuthoritySwaCode")
        .on("roadworks")
        .column("highwayAuthoritySwaCode")
        .execute()
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db){
    await db.schema.dropTable("roadworks").execute();
    await db.schema.dropTable("highway_authority_admin_areas").execute();
}