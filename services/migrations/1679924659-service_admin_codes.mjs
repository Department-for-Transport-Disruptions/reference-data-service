import { CreateTableBuilder, Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .createTable("service_admin_area_codes")
        .addColumn("serviceId", "integer", (col) => col.notNull())
        .addColumn("adminAreaCode", "varchar(50)", (col) => col.notNull())
        .addPrimaryKeyConstraint("primary_key", ["serviceId", "adminAreaCode"])
        .addForeignKeyConstraint(
            "fk_serviceadminareacodes_services_serviceId",
            ["serviceId"],
            "services",
            ["id"],
            (cb) => cb.onDelete("restrict").onUpdate("restrict"),
        )
        .execute();

    await db.schema.createIndex("idx_adminAreaCode").on("service_admin_area_codes").column("adminAreaCode").execute();

    await sql`ALTER TABLE service_admin_area_codes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(
        db,
    );
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("service_admin_area_codes").execute();
}
