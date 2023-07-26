import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await sql`select count(*) as count from service_journey_pattern_links`.execute(db).then(async (data)=>{
        let count = parseInt(data.rows[0].count / 1000);
        const promises = []
        for(let i =0; i<=count; i++ ) {
            promises.push(sql`Delete from service_journey_pattern_links limit 1000`.execute(db));
        } 
        await Promise.all(promises);
    });
    await sql`ALTER TABLE service_journey_pattern_links ADD routeLinkRef VARCHAR(255)`.execute(db);
    await db.schema
        .createTable("routes")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("operatorServiceId", "integer")
        .addColumn("routeSectionId", "varchar(255)")
        .addColumn("routeLinkId", "varchar(255)")
        .addColumn("fromAtcoCode", "varchar(255)")
        .addColumn("toAtcoCode", "varchar(255)")
        .addColumn("locationId", "varchar(255)")
        .addColumn("longitude", "varchar(255)")
        .addColumn("latitude", "varchar(255)")
        .addForeignKeyConstraint(
            "fk_routes_services_id",
            ["operatorServiceId"],
            "services",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("restrict"),
        )
        .execute();

    await db.schema.createIndex("idx_routesServiceId").on("routes").column("operatorServiceId").execute();
    await db.schema.createIndex("idx_routeLinkId").on("routes").column("routeLinkId").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await sql`ALTER TABLE service_journey_pattern_links DROP COLUMN routeLinkRef`.execute(db);
    await db.schema.dropTable("routes").execute();
}
