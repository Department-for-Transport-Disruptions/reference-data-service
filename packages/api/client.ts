import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";
import { Database } from "@reference-data-service/core/db";

export enum VehicleMode {
    bus = "bus",
    tram = "tram",
    coach = "coach",
    ferry = "ferry",
    underground = "underground",
    rail = "rail",
    metro = "metro",
    blank = "",
}

export const isValidMode = (mode: string): mode is VehicleMode => !!mode && mode in VehicleMode;

export const isDataSource = (input: string): input is DataSource => input in DataSource;

const ignoredStopTypes = ["FTD", "LSE", "RSE", "TMU"];

export type OperatorQueryInput = {
    nocCode?: string;
    batchNocCodes?: string[];
    adminAreaCodes?: string[];
    modes?: VehicleMode[];
    page?: number;
    dataSource?: DataSource;
};

export const getOperators = async (dbClient: Kysely<Database>, input: OperatorQueryInput) => {
    logger.info("Starting getOperators...");

    const OPERATORS_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 50 : 1000;

    if (input.nocCode) {
        const services = await dbClient
            .selectFrom("services")
            .select([
                "services.id as serviceId",
                "services.lineName",
                "services.lineId",
                "services.serviceDescription",
                "services.origin",
                "services.destination",
                "services.mode",
            ])
            .where((qb) => qb.where("services.endDate", "is", null).orWhere("services.endDate", ">=", sql`CURDATE()`))
            .where("nocCode", "=", input.nocCode)
            .execute();

        const operator = await dbClient
            .selectFrom("operators")
            .leftJoin("operator_lines", "operator_lines.nocCode", "operators.nocCode")
            .leftJoin("operator_public_data", "operator_public_data.pubNmId", "operators.pubNmId")
            .selectAll(["operators", "operator_lines", "operator_public_data"])
            .where("operators.nocCode", "=", input.nocCode)
            .executeTakeFirst();

        if (!operator) {
            return null;
        }

        return {
            ...operator,
            services,
        };
    }

    return dbClient
        .selectFrom("operators")
        .innerJoin("services", "services.nocCode", "operators.nocCode")
        .$if(!!input.batchNocCodes && input.batchNocCodes.length > 0, (qb) =>
            qb.where("nocCode", "in", input.batchNocCodes ?? []),
        )
        .$if(!!input.adminAreaCodes && input.adminAreaCodes.length > 0, (qb) =>
            qb
                .innerJoin("service_admin_area_codes", "service_admin_area_codes.serviceId", "services.id")
                .where("service_admin_area_codes.adminAreaCode", "in", input.adminAreaCodes ?? []),
        )
        .$if(!!input.modes && input.modes.length > 0, (qb) => qb.where("services.mode", "in", input.modes ?? []))
        .$if(!!input.dataSource, (qb) => qb.where("services.dataSource", "=", input.dataSource ?? DataSource.bods))
        .select([
            "operators.id",
            "operators.nocCode",
            "operatorPublicName",
            "operators.vosaPsvLicenseName",
            "operators.opId",
            "operators.pubNmId",
            "operators.nocCdQual",
            "operators.changeDate",
            "operators.changeAgent",
            "operators.changeComment",
            "operators.dateCeased",
            "operators.dataOwner",
            "services.mode",
            "services.dataSource",
        ])
        .distinct()
        .orderBy("operators.id")
        .offset((input.page || 0) * OPERATORS_PAGE_SIZE)
        .limit(OPERATORS_PAGE_SIZE)
        .execute();
};

export type Operators = Awaited<ReturnType<typeof getOperators>>;

export type StopsQueryInput = {
    atcoCodes?: string[];
    naptanCodes?: string[];
    commonName?: string;
    adminAreaCodes?: string[];
    page?: number;
    polygon?: string;
};

export const getStops = async (dbClient: Kysely<Database>, input: StopsQueryInput) => {
    logger.info("Starting getStops...");

    const STOPS_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 100 : 1000;

    const stops = await dbClient
        .selectFrom("stops")
        .select([
            "id",
            "atcoCode",
            "naptanCode",
            "commonName",
            "street",
            "indicator",
            "bearing",
            "nptgLocalityCode",
            "localityName",
            "parentLocalityName",
            "longitude",
            "latitude",
            "stopType",
            "busStopType",
            "timingStatus",
            "administrativeAreaCode",
            "status",
        ])
        .$if(!!input.atcoCodes?.[0], (qb) => qb.where("atcoCode", "in", input.atcoCodes ?? ["---"]))
        .$if(!!input.naptanCodes?.[0], (qb) => qb.where("naptanCode", "in", input.naptanCodes ?? ["---"]))
        .$if(!!input.commonName, (qb) =>
            qb.where("commonName", "like", input.commonName ? `%${input.commonName}%` : "---"),
        )
        .$if(!!input.adminAreaCodes?.[0], (qb) =>
            qb
                .where("administrativeAreaCode", "in", input.adminAreaCodes ?? ["---"])
                .$if(!!input.polygon, (qb) =>
                    qb.where(
                        sql`ST_CONTAINS(ST_GEOMFROMTEXT(${input.polygon}), Point(stops.longitude, stops.latitude))`,
                    ),
                ),
        )
        .where("stopType", "not in", ignoredStopTypes)
        .where("status", "=", "active")
        .offset((input.page || 0) * STOPS_PAGE_SIZE)
        .limit(STOPS_PAGE_SIZE)
        .execute();

    return stops;
};

export type Stops = Awaited<ReturnType<typeof getStops>>;

export type ServiceStop = {
    direction: string;
    sequenceNumber: string;
} & Stops[0];

export enum ServiceFields {
    nocCode = "nocCode",
    lineName = "lineName",
    lineId = "lineId",
    startDate = "startDate",
    endDate = "endDate",
    serviceDescription = "serviceDescription",
    inboundDirectionDescription = "inboundDirectionDescription",
    outboundDirectionDescription = "outboundDirectionDescription",
    origin = "origin",
    destination = "destination",
    serviceCode = "serviceCode",
    operatorShortName = "operatorShortName",
    mode = "mode",
    dataSource = "dataSource",
}

export enum DataSource {
    bods = "bods",
    tnds = "tnds",
}

export type ServicesForOperatorQueryInput = {
    nocCode: string;
    dataSource: DataSource;
    modes?: VehicleMode[];
};

export const getServicesForOperator = async (dbClient: Kysely<Database>, input: ServicesForOperatorQueryInput) => {
    logger.info("Starting getServicesForOperator...");

    return dbClient
        .selectFrom("services")
        .selectAll()
        .where("nocCode", "=", input.nocCode)
        .where("dataSource", "=", input.dataSource)
        .$if(!!input.modes && input.modes.length > 0, (qb) => qb.where("mode", "in", input.modes ?? []))
        .where((qb) => qb.where("services.endDate", "is", null).orWhere("services.endDate", ">=", sql`CURDATE()`))
        .orderBy("lineName", "asc")
        .orderBy("startDate", "asc")
        .execute();
};

export type ServicesForOperator = Awaited<ReturnType<typeof getServicesForOperator>>;

export type ServiceByIdQueryInput = {
    nocCode: string;
    serviceId: number;
};

export const getServiceById = async (dbClient: Kysely<Database>, input: ServiceByIdQueryInput) => {
    logger.info("Starting getService...");

    const service = await dbClient
        .selectFrom("services")
        .innerJoin("service_journey_patterns", "service_journey_patterns.operatorServiceId", "services.id")
        .innerJoin(
            "service_journey_pattern_links",
            "service_journey_pattern_links.journeyPatternId",
            "service_journey_patterns.id",
        )
        .innerJoin("stops as fromStop", "fromStop.atcoCode", "service_journey_pattern_links.fromAtcoCode")
        .innerJoin("stops as toStop", "toStop.atcoCode", "service_journey_pattern_links.toAtcoCode")
        .selectAll(["services"])
        .select([
            "service_journey_patterns.id as journeyPatternId",
            "service_journey_patterns.direction",
            "service_journey_patterns.destinationDisplay",
            "service_journey_pattern_links.fromTimingStatus",
            "service_journey_pattern_links.toTimingStatus",
            "service_journey_pattern_links.orderInSequence",
            "service_journey_pattern_links.fromSequenceNumber",
            "service_journey_pattern_links.toSequenceNumber",
            "service_journey_pattern_links.runtime",
            "fromStop.naptanCode as fromNaptanCode",
            "fromStop.atcoCode as fromAtcoCode",
            "fromStop.commonName as fromCommonName",
            "fromStop.nptgLocalityCode as fromNptgLocalityCode",
            "fromStop.localityName as fromLocalityName",
            "fromStop.parentLocalityName as fromParentLocalityName",
            "fromStop.indicator as fromIndicator",
            "fromStop.street as fromStreet",
            "fromStop.latitude as fromLatitude",
            "fromStop.longitude as fromLongitude",
            "toStop.naptanCode as toNaptanCode",
            "toStop.atcoCode as toAtcoCode",
            "toStop.commonName as toCommonName",
            "toStop.nptgLocalityCode as toNptgLocalityCode",
            "toStop.localityName as toLocalityName",
            "toStop.parentLocalityName as toParentLocalityName",
            "toStop.indicator as toIndicator",
            "toStop.street as toStreet",
            "toStop.latitude as toLatitude",
            "toStop.longitude as toLongitude",
        ])
        .where("services.nocCode", "=", input.nocCode)
        .where("services.id", "=", input.serviceId)
        .where("fromStop.stopType", "not in", ignoredStopTypes)
        .where("toStop.stopType", "not in", ignoredStopTypes)
        .where((qb) => qb.where("services.endDate", "is", null).orWhere("services.endDate", ">=", sql`CURDATE()`))
        .orderBy("services.startDate", "asc")
        .execute();

    if (!service?.[0]?.nocCode) {
        return null;
    }

    return service;
};

export type Service = Awaited<ReturnType<typeof getServiceById>>;

export type ServicesQueryInput = {
    dataSource: DataSource;
    page: number;
    adminAreaCodes?: string[];
    modes?: VehicleMode[];
};

export const getServices = async (dbClient: Kysely<Database>, input: ServicesQueryInput) => {
    logger.info("Starting getServices...");

    const SERVICES_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 50 : 1000;

    const services = await dbClient
        .selectFrom("services")
        .selectAll(["services"])
        .where("dataSource", "=", input.dataSource)
        .$if(!!input.modes?.[0], (qb) => qb.where("mode", "in", input.modes ?? ["---"]))
        .$if(!!input.adminAreaCodes?.[0], (qb) =>
            qb
                .innerJoin("service_admin_area_codes", "service_admin_area_codes.serviceId", "services.id")
                .where("service_admin_area_codes.adminAreaCode", "in", input.adminAreaCodes ?? []),
        )
        .offset((input.page || 0) * SERVICES_PAGE_SIZE)
        .limit(SERVICES_PAGE_SIZE)
        .execute();

    return services;
};

export type Services = Awaited<ReturnType<typeof getServices>>;

export type ServiceStopsQueryInput = {
    serviceId: number;
    dataSource: DataSource;
    modes?: VehicleMode[];
    busStopType?: string;
    stopTypes?: string[];
};

export const getServiceStops = async (dbClient: Kysely<Database>, input: ServiceStopsQueryInput) => {
    logger.info("Starting getServiceStops...");

    const stops = await dbClient
        .selectFrom("services")
        .innerJoin("service_journey_patterns", "service_journey_patterns.operatorServiceId", "services.id")
        .innerJoin(
            "service_journey_pattern_links",
            "service_journey_pattern_links.journeyPatternId",
            "service_journey_patterns.id",
        )
        .innerJoin("stops as fromStop", "fromStop.atcoCode", "service_journey_pattern_links.fromAtcoCode")
        .innerJoin("stops as toStop", "toStop.atcoCode", "service_journey_pattern_links.toAtcoCode")
        .select([
            "services.id as serviceId",
            "fromStop.id as fromId",
            "fromStop.atcoCode as fromAtcoCode",
            "fromStop.naptanCode as fromNaptanCode",
            "fromStop.commonName as fromCommonName",
            "fromStop.street as fromStreet",
            "fromStop.indicator as fromIndicator",
            "fromStop.bearing as fromBearing",
            "fromStop.nptgLocalityCode as fromNptgLocalityCode",
            "fromStop.localityName as fromLocalityName",
            "fromStop.parentLocalityName as fromParentLocalityName",
            "fromStop.longitude as fromLongitude",
            "fromStop.latitude as fromLatitude",
            "fromStop.stopType as fromStopType",
            "fromStop.busStopType as fromBusStopType",
            "fromStop.timingStatus as fromTimingStatus",
            "fromStop.administrativeAreaCode as fromAdministrativeAreaCode",
            "fromStop.status as fromStatus",
            "toStop.id as toId",
            "toStop.atcoCode as toAtcoCode",
            "toStop.naptanCode as toNaptanCode",
            "toStop.commonName as toCommonName",
            "toStop.street as toStreet",
            "toStop.indicator as toIndicator",
            "toStop.bearing as toBearing",
            "toStop.nptgLocalityCode as toNptgLocalityCode",
            "toStop.localityName as toLocalityName",
            "toStop.parentLocalityName as toParentLocalityName",
            "toStop.longitude as toLongitude",
            "toStop.latitude as toLatitude",
            "toStop.stopType as toStopType",
            "toStop.busStopType as toBusStopType",
            "toStop.timingStatus as toTimingStatus",
            "toStop.administrativeAreaCode as toAdministrativeAreaCode",
            "toStop.status as toStatus",
            "service_journey_pattern_links.fromSequenceNumber",
            "service_journey_patterns.direction",
        ])
        .groupBy(["fromId", "toId"])
        .where("services.id", "=", input.serviceId)
        .where("services.dataSource", "=", input.dataSource)
        .where("fromStop.stopType", "not in", ignoredStopTypes)
        .where("toStop.stopType", "not in", ignoredStopTypes)
        .where((qb) => qb.where("fromStop.status", "=", "active").orWhere("toStop.status", "=", "active"))
        .$if(!!input.modes?.[0], (qb) => qb.where("mode", "in", input.modes ?? ["---"]))
        .$if(!!input.stopTypes?.[0], (qb) => qb.where("stopType", "in", input.stopTypes ?? ["---"]))
        .$if(!!input.busStopType, (qb) => qb.where("busStopType", "=", input.busStopType ?? "---"))
        .orderBy("service_journey_pattern_links.fromSequenceNumber")
        .orderBy("service_journey_patterns.direction")
        .execute();

    return stops;
};

export type ServiceStops = Awaited<ReturnType<typeof getServiceStops>>;

export type ServicesByStopsQueryInput = {
    dataSource: DataSource;
    page: number;
    stops: string[];
    modes?: VehicleMode[];
    includeRoutes: boolean;
};

export const getServicesByStops = async (dbClient: Kysely<Database>, input: ServicesByStopsQueryInput) => {
    logger.info("Starting getServicesByStops...");

    const services = await dbClient
        .selectFrom("services")
        .innerJoin("service_journey_patterns", "service_journey_patterns.operatorServiceId", "services.id")
        .innerJoin(
            "service_journey_pattern_links",
            "service_journey_pattern_links.journeyPatternId",
            "service_journey_patterns.id",
        )
        .selectAll("services")
        .select(["fromAtcoCode", "toAtcoCode"])
        .where((qb) => qb.where("fromAtcoCode", "in", input.stops).orWhere("toAtcoCode", "in", input.stops))
        .where("dataSource", "=", input.dataSource)
        .groupBy(["fromAtcoCode", "toAtcoCode"])
        .orderBy("service_journey_pattern_links.fromSequenceNumber")
        .orderBy("service_journey_patterns.direction")
        .execute();

    return services;
};

export type ServicesByStops = Awaited<ReturnType<typeof getServicesByStops>>;

export const getAdminAreaCodes = async (dbClient: Kysely<Database>) => {
    logger.info("Starting getAdminAreaCodes...");

    const areaCodes = await dbClient.selectFrom("stops").select("administrativeAreaCode").distinct().execute();

    return areaCodes;
};

export type AdminAreaCodes = Awaited<ReturnType<typeof getAdminAreaCodes>>;
