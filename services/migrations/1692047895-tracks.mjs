import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .createTable("tracks")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("operatorServiceId", "integer")
        .addColumn("longitude", "varchar(255)")
        .addColumn("latitude", "varchar(255)")
        .execute();

    await db.schema.createIndex("idx_operatorServiceId").on("tracks").column("operatorServiceId").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("tracks").execute();
}
