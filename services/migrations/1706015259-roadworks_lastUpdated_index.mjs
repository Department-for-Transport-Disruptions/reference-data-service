/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema.createIndex("idx_lastUpdatedDatetime").on("roadworks").column("lastUpdatedDatetime").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropIndex("idx_lastUpdatedDatetime").on("roadworks").execute();
}
