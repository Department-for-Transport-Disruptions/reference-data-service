import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .createTable("nptg_admin_areas")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("administrativeAreaCode", "varchar(255)", (col) => col.notNull())
        .addColumn("atcoAreaCode", "varchar(255)")
        .addColumn("name", "varchar(255)")
        .addColumn("shortName", "varchar(255)")
        .execute();

    await db.schema
        .createIndex("idx_administrativeAreaCode")
        .on("nptg_admin_areas")
        .column("administrativeAreaCode")
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("nptg_admin_areas").execute();
}
