/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .alterTable("services")
        .addColumn("filePath", "varchar(1000)", (col) => col.defaultTo(null))
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.alterTable("services").dropColumn("filePath").execute();
}
