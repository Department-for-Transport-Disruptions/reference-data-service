import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .alterTable("vehicle_journeys")
        .addColumn("daysOfWeek", "VARCHAR(500)")
        .addColumn("daysOfOperation", "VARCHAR(500)")
        .addColumn("daysOfNonOperation", "VARCHAR(500)")
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.alterTable("vehicle_journeys")
        .dropColumn("daysOfWeek")
        .dropColumn("daysOfOperation")
        .dropColumn("daysOfNonOperation")
        .execute();
}
