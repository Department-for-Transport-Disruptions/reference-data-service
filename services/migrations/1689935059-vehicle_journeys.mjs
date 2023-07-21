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
        
    await db.schema.createIndex("idx_journeyPatternRef").on("vehicle_journeys").column("journeyPatternRef").execute();

    await sql`ALTER TABLE service_journey_patterns ADD journeyPatternRef varchar(255);`.execute(
        db,
    )
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("vehicle_journeys").execute();
}
