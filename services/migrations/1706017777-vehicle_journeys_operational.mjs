import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .alterTable("vehicle_journeys")
        .addColumn("operationalForToday", "boolean")
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.alterTable("vehicle_journeys")
        .dropColumn("operationalForToday")
        .execute();
}