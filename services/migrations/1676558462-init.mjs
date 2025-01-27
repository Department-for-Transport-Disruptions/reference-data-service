import { sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await db.schema
        .createTable("stops")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("atcoCode", "varchar(255)", (col) => col.unique())
        .addColumn("naptanCode", "varchar(255)")
        .addColumn("plateCode", "varchar(255)")
        .addColumn("cleardownCode", "varchar(255)")
        .addColumn("commonName", "varchar(255)")
        .addColumn("commonNameLang", "varchar(255)")
        .addColumn("shortCommonName", "varchar(255)")
        .addColumn("shortCommonNameLang", "varchar(255)")
        .addColumn("landmark", "varchar(255)")
        .addColumn("landmarkLang", "varchar(255)")
        .addColumn("street", "varchar(255)")
        .addColumn("streetLang", "varchar(255)")
        .addColumn("crossing", "varchar(255)")
        .addColumn("crossingLang", "varchar(255)")
        .addColumn("indicator", "varchar(255)")
        .addColumn("indicatorLang", "varchar(255)")
        .addColumn("bearing", "varchar(255)")
        .addColumn("nptgLocalityCode", "varchar(255)")
        .addColumn("localityName", "varchar(255)")
        .addColumn("parentLocalityName", "varchar(255)")
        .addColumn("grandParentLocalityName", "varchar(255)")
        .addColumn("town", "varchar(255)")
        .addColumn("townLang", "varchar(255)")
        .addColumn("suburb", "varchar(255)")
        .addColumn("suburbLang", "varchar(255)")
        .addColumn("localityCentre", "varchar(255)")
        .addColumn("gridType", "varchar(255)")
        .addColumn("easting", "varchar(255)")
        .addColumn("northing", "varchar(255)")
        .addColumn("longitude", "varchar(255)")
        .addColumn("latitude", "varchar(255)")
        .addColumn("stopType", "varchar(255)")
        .addColumn("busStopType", "varchar(255)")
        .addColumn("timingStatus", "varchar(255)")
        .addColumn("defaultWaitTime", "varchar(255)")
        .addColumn("notes", "varchar(255)")
        .addColumn("notesLang", "varchar(255)")
        .addColumn("administrativeAreaCode", "varchar(255)")
        .addColumn("creationDateTime", "varchar(255)")
        .addColumn("modificationDateTime", "varchar(255)")
        .addColumn("revisionNumber", "varchar(255)")
        .addColumn("modification", "varchar(255)")
        .addColumn("status", "varchar(255)")
        .execute();

    await db.schema.createIndex("idx_atcoCode").on("stops").column("atcoCode").execute();
    await db.schema.createIndex("idx_naptanCode").on("stops").column("naptanCode").execute();

    await db.schema
        .createTable("operators")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("nocCode", "varchar(255)", (col) => col.notNull().unique())
        .addColumn("operatorPublicName", "varchar(255)")
        .addColumn("vosaPsvLicenseName", "varchar(255)")
        .addColumn("opId", "varchar(255)")
        .addColumn("pubNmId", "varchar(255)")
        .addColumn("nocCdQual", "varchar(255)")
        .addColumn("changeDate", "varchar(255)")
        .addColumn("changeAgent", "varchar(255)")
        .addColumn("changeComment", "varchar(255)")
        .addColumn("dateCeased", "varchar(255)")
        .addColumn("dataOwner", "varchar(255)")
        .execute();

    await db.schema.createIndex("idx_nocCode").on("operators").column("nocCode").execute();
    await db.schema.createIndex("idx_pubNmId").on("operators").column("pubNmId").execute();

    await db.schema
        .createTable("operator_lines")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("nocLineNo", "varchar(255)", (col) => col.notNull())
        .addColumn("nocCode", "varchar(255)")
        .addColumn("pubNm", "varchar(255)")
        .addColumn("refNm", "varchar(255)")
        .addColumn("licence", "varchar(255)")
        .addColumn("mode", "varchar(255)")
        .addColumn("tlRegOwn", "varchar(255)")
        .addColumn("ebsrAgent", "varchar(255)")
        .addColumn("lo", "varchar(255)")
        .addColumn("sw", "varchar(255)")
        .addColumn("wm", "varchar(255)")
        .addColumn("wa", "varchar(255)")
        .addColumn("yo", "varchar(255)")
        .addColumn("nw", "varchar(255)")
        .addColumn("ne", "varchar(255)")
        .addColumn("sc", "varchar(255)")
        .addColumn("se", "varchar(255)")
        .addColumn("ea", "varchar(255)")
        .addColumn("em", "varchar(255)")
        .addColumn("ni", "varchar(255)")
        .addColumn("nx", "varchar(255)")
        .addColumn("megabus", "varchar(255)")
        .addColumn("newBharat", "varchar(255)")
        .addColumn("terravision", "varchar(255)")
        .addColumn("ncsd", "varchar(255)")
        .addColumn("easybus", "varchar(255)")
        .addColumn("yorksRt", "varchar(255)")
        .addColumn("travelEnq", "varchar(255)")
        .addColumn("comment", "varchar(255)")
        .addColumn("auditDate", "varchar(255)")
        .addColumn("auditEditor", "varchar(255)")
        .addColumn("auditComment", "varchar(255)")
        .addColumn("duplicate", "varchar(255)")
        .addColumn("dateCeased", "varchar(255)")
        .addColumn("cessationComment", "varchar(255)")
        .addForeignKeyConstraint("fk_operatorlines_operators_nocCode", ["nocCode"], "operators", ["nocCode"], (cb) =>
            cb.onDelete("restrict").onUpdate("restrict"),
        )
        .execute();

    await db.schema.createIndex("idx_nocCode").on("operator_lines").column("nocCode").execute();

    await db.schema
        .createTable("operator_public_data")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("pubNmId", "varchar(255)", (col) => col.notNull())
        .addColumn("operatorPublicName", "varchar(255)")
        .addColumn("pubNmQual", "varchar(255)")
        .addColumn("ttrteEnq", "varchar(255)")
        .addColumn("fareEnq", "varchar(255)")
        .addColumn("lostPropEnq", "varchar(255)")
        .addColumn("disruptEnq", "varchar(255)")
        .addColumn("ebsrAgent", "varchar(255)")
        .addColumn("complEnq", "varchar(255)")
        .addColumn("twitter", "varchar(255)")
        .addColumn("facebook", "varchar(255)")
        .addColumn("linkedin", "varchar(255)")
        .addColumn("youtube", "varchar(255)")
        .addColumn("changeDate", "varchar(255)")
        .addColumn("changeAgent", "varchar(255)")
        .addColumn("changeComment", "varchar(255)")
        .addColumn("ceasedDate", "varchar(255)")
        .addColumn("dataOwner", "varchar(255)")
        .addColumn("website", "varchar(255)")
        .addForeignKeyConstraint(
            "fk_operatorpublicdata_operators_pubNmId",
            ["pubNmId"],
            "operators",
            ["pubNmId"],
            (cb) => cb.onDelete("restrict").onUpdate("restrict"),
        )
        .execute();

    await db.schema.createIndex("idx_pubNmId").on("operator_public_data").column("pubNmId").execute();

    await db.schema
        .createTable("services")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("nocCode", "varchar(255)")
        .addColumn("lineName", "varchar(255)", (col) => col.notNull())
        .addColumn("startDate", "date")
        .addColumn("operatorShortName", "varchar(255)")
        .addColumn("serviceDescription", "varchar(255)")
        .addColumn("serviceCode", "varchar(255)")
        .addColumn("regionCode", "varchar(255)")
        .addColumn("dataSource", sql`enum('bods', 'tnds')`, (col) => col.notNull())
        .addColumn("origin", "varchar(255)")
        .addColumn("destination", "varchar(255)")
        .addColumn("lineId", "varchar(255)")
        .addColumn("endDate", "date")
        .addColumn("inboundDirectionDescription", "varchar(255)")
        .addColumn("outboundDirectionDescription", "varchar(255)")
        .addColumn("mode", "varchar(255)")
        .addForeignKeyConstraint("fk_services_operators_nocCode", ["nocCode"], "operators", ["nocCode"], (cb) =>
            cb.onDelete("restrict").onUpdate("restrict"),
        )
        .execute();

    await db.schema.createIndex("idx_dataSource").on("services").column("dataSource").execute();
    await db.schema.createIndex("idx_lineName").on("services").column("lineName").execute();
    await db.schema.createIndex("idx_nocCode").on("services").column("nocCode").execute();
    await db.schema.createIndex("idx_startDate").on("services").column("startDate").execute();

    await db.schema
        .createTable("service_journey_patterns")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("operatorServiceId", "integer", (col) => col.notNull())
        .addColumn("destinationDisplay", "varchar(255)")
        .addColumn("direction", "varchar(50)")
        .addColumn("routeRef", "varchar(50)")
        .addColumn("sectionRefs", "text")
        .addForeignKeyConstraint(
            "fk_servicejourneypatterns_services_id",
            ["operatorServiceId"],
            "services",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("restrict"),
        )
        .execute();

    await db.schema
        .createIndex("idx_operatorServiceId")
        .on("service_journey_patterns")
        .column("operatorServiceId")
        .execute();

    await db.schema
        .createTable("service_journey_pattern_links")
        .addColumn("journeyPatternId", "integer", (col) => col.notNull())
        .addColumn("fromAtcoCode", "varchar(255)", (col) => col.notNull())
        .addColumn("fromTimingStatus", "varchar(255)")
        .addColumn("toAtcoCode", "varchar(255)", (col) => col.notNull())
        .addColumn("toTimingStatus", "varchar(255)")
        .addColumn("runtime", "varchar(255)")
        .addColumn("orderInSequence", "integer", (col) => col.notNull())
        .addColumn("fromSequenceNumber", "varchar(255)")
        .addColumn("toSequenceNumber", "varchar(255)")
        .addForeignKeyConstraint(
            "fk_servicejourneypatternlinks_stops_fromAtcoCode",
            ["fromAtcoCode"],
            "stops",
            ["atcoCode"],
            (cb) => cb.onDelete("cascade").onUpdate("restrict"),
        )
        .addForeignKeyConstraint(
            "fk_servicejourneypatternlinks_stops_toAtcoCode",
            ["toAtcoCode"],
            "stops",
            ["atcoCode"],
            (cb) => cb.onDelete("cascade").onUpdate("restrict"),
        )
        .addForeignKeyConstraint(
            "fk_servicejourneypatternlinks_servicejourneypatterns_id",
            ["journeyPatternId"],
            "service_journey_patterns",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("restrict"),
        )
        .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema
        .dropTable("service_journey_pattern_links")
        .dropTable("service_journey_patterns")
        .dropTable("services")
        .dropTable("operator_public_data")
        .dropTable("operator_lines")
        .dropTable("operators")
        .dropTable("stops")
        .execute();
}
