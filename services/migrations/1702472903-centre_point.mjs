import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .alterTable("services")
        .addColumn("centrePointLon", "varchar(255)", (cb) => cb.defaultTo(null))
        .addColumn("centrePointLat", "varchar(255)", (cb) => cb.defaultTo(null))
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.alterTable("services").dropColumn("centrePointLon").dropColumn("centrePointLat").execute();
}
