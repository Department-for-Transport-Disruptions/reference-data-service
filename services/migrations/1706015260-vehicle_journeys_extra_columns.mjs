/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .alterTable("vehicle_journeys")
        .addColumn("departureTime", "varchar(255)")
        .addColumn("journeyCode", "varchar(255)")
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.alterTable("vehicle_journeys").dropColumn("departureTime").dropColumn("journeyCode").execute();
}
