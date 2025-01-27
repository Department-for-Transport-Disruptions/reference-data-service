/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema.createIndex("idx_nptgLocalityCode").on("stops").column("nptgLocalityCode").execute();
    await db.schema.createIndex("idx_nptgLocalityCode").on("localities").column("nptgLocalityCode").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropIndex("idx_nptgLocalityCode").on("stops").execute();
    await db.schema.dropIndex("idx_nptgLocalityCode").on("localities").execute();
}
