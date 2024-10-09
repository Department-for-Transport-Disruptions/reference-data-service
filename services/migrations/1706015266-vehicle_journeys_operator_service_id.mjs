import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .alterTable("vehicle_journeys")
        .addColumn("operatorServiceId", "integer")
        .execute();
    
    await db.schema.createIndex("idx_operatorServiceId").on("vehicle_journeys").column("operatorServiceId").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.alterTable("vehicle_journeys").dropColumn("operatorServiceId").execute();
    await db.schema.dropIndex("idx_operatorServiceId").on("vehicle_journeys").execute();
}
