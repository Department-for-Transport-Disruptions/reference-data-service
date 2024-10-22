/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema.createIndex("idx_commonName").on("stops").column("commonName").execute();
    await db.schema.createIndex("idx_adminAreaCode").on("stops").column("administrativeAreaCode").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropIndex("idx_commonName").on("stops").execute();
    await db.schema.dropIndex("idx_adminAreaCode").on("stops").execute();
}
