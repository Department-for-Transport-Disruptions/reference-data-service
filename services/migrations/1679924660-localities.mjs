import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .createTable("localities")
        .addColumn("nptgLocalityCode", "varchar(255)", (col) => col.notNull())
        .addColumn("localityName", "varchar(255)")
        .addColumn("localityNameLang", "varchar(25)")
        .addColumn("shortName", "varchar(255)")
        .addColumn("shortNameLang", "varchar(25)")
        .addColumn("qualifierName", "varchar(255)")
        .addColumn("qualifierNameLang", "varchar(25)")
        .addColumn("qualifierLocalityRef", "varchar(255)")
        .addColumn("qualifierDistrictRef", "varchar(255)")
        .addColumn("parentLocalityName", "varchar(255)")
        .addColumn("parentLocalityNameLang", "varchar(25)")
        .addColumn("administrativeAreaCode", "varchar(255)", (col) => col.notNull())
        .addColumn("nptgDistrictCode", "varchar(255)")
        .addColumn("sourceLocalityType", "varchar(255)")
        .addColumn("gridType", "varchar(255)")
        .addColumn("easting", "varchar(255)")
        .addColumn("northing", "varchar(255)")
        .addColumn("creationDateTime", "varchar(255)")
        .addColumn("modificationDateTime", "varchar(255)")
        .addColumn("revisionNumber", "varchar(255)")
        .addColumn("modification","varchar(255)")
        .addPrimaryKeyConstraint("primary_key", ["nptgLocalityCode"])
        .execute();

        await db.schema.createIndex("idx_adminAreaCode").on("localities").column("administrativeAreaCode").execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("localities").execute();
}
