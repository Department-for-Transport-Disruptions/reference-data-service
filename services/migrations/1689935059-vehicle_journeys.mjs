import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .createTable("vehicle_journeys")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("vehicleJourneyCode", "varchar(255)")
        .addColumn("serviceRef", "varchar(255)")
        .addColumn("lineRef", "varchar(255)")
        .addColumn("journeyPatternRef", "varchar(255)")
        .execute();

    await db.schema.alterTable("service_journey_patterns").addColumn("journeyPatternRef", "varchar(255)").execute();

    await db.schema.createIndex("idx_journeyPatternRef").on("vehicle_journeys").column("journeyPatternRef").execute();
    await db.schema
        .createIndex("idx_journeyPatternRef")
        .on("service_journey_patterns")
        .column("journeyPatternRef")
        .execute();
    await db.schema.createIndex("idx_lineRef").on("vehicle_journeys").column("lineRef").execute();
    await db.schema.createIndex("idx_lineId").on("services").column("lineId").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("vehicle_journeys").execute();
    await db.schema.alterTable("service_journey_patterns").dropColumn("journeyPatternRef", "varchar(255)").execute();

    await db.schema.dropIndex("idx_lineRef").on("vehicle_journeys").execute();
    await db.schema.dropIndex("idx_lineId").on("services").execute();
}
