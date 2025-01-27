/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema.createIndex("idx_serviceRef").on("vehicle_journeys").column("serviceRef").execute();
    await db.schema.createIndex("idx_serviceCode").on("services").column("serviceCode").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropIndex("idx_serviceRef").on("vehicle_journeys").execute();
    await db.schema.dropIndex("idx_serviceCode").on("services").execute();
}
