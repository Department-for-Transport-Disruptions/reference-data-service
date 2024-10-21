/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema.createIndex("idx_actualEndDatetime").on("roadworks").column("actualEndDatetime").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropIndex("idx_actualEndDatetime").on("roadworks").execute();
}
