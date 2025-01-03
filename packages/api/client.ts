import { Database } from "@reference-data-service/core/db";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";
import { PermitStatus } from "./utils/roadworkTypes.zod";

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

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
const ignoredBusStopTypes = ["HAR", "FLX"];

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

    const OPERATORS_PAGE_SIZE = 1000;

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
            .where((qb) =>
                qb.or([
                    qb("services.endDate", "is", null),
                    qb(sql`STR_TO_DATE(services.endDate, '%Y-%m-%d')`, ">=", sql`CURDATE()`),
                ]),
            )
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

    let query = dbClient.selectFrom("operators").innerJoin("services", "services.nocCode", "operators.nocCode");

    if (input.batchNocCodes && input.batchNocCodes.length > 0) {
        query = query.where("nocCode", "in", input.batchNocCodes ?? []);
    }

    if (!!input.adminAreaCodes && input.adminAreaCodes.length > 0) {
        query = query
            .innerJoin("service_admin_area_codes", "service_admin_area_codes.serviceId", "services.id")
            .where("service_admin_area_codes.adminAreaCode", "in", input.adminAreaCodes ?? []);
    }

    if (!!input.modes && input.modes.length > 0) {
        query = query.where("services.mode", "in", input.modes);
    }

    if (input.dataSource) {
        query = query.where("services.dataSource", "=", input.dataSource ?? DataSource.bods);
    }

    return query
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
    adminAreaCodes?: string[];
    page?: number;
    polygon?: string;
    stopTypes?: string[];
    searchInput?: string;
};

export const getStops = async (dbClient: Kysely<Database>, input: StopsQueryInput) => {
    logger.info("Starting getStops...");

    const STOPS_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 100 : 1000;

    const stops = await dbClient
        .selectFrom("stops")
        .innerJoin("localities", "localities.nptgLocalityCode", "stops.nptgLocalityCode")
        .select([
            "stops.id",
            "stops.atcoCode",
            "stops.naptanCode",
            "stops.commonName",
            "stops.street",
            "stops.indicator",
            "stops.bearing",
            "stops.nptgLocalityCode",
            "stops.localityName",
            "stops.parentLocalityName",
            "stops.longitude",
            "stops.latitude",
            "stops.stopType",
            "stops.busStopType",
            "stops.timingStatus",
            "localities.administrativeAreaCode",
            "stops.status",
        ])
        .where("stopType", "not in", ignoredStopTypes)
        .where("busStopType", "not in", ignoredBusStopTypes)
        .where("status", "=", "active")
        .$if(!!input.atcoCodes?.[0], (qb) => qb.where("atcoCode", "in", input.atcoCodes ?? ["---"]))
        .$if(!!input.naptanCodes?.[0], (qb) => qb.where("naptanCode", "in", input.naptanCodes ?? ["---"]))
        .$if(!!input.adminAreaCodes?.[0], (qb) =>
            qb
                .where("localities.administrativeAreaCode", "in", input.adminAreaCodes ?? ["---"])
                .$if(!!input.polygon, (qb) =>
                    qb.where(
                        sql<boolean>`ST_CONTAINS(ST_GEOMFROMTEXT(${input.polygon}), Point(stops.longitude, stops.latitude))`,
                    ),
                ),
        )
        .$if(!!input.stopTypes?.[0], (qb) => qb.where("stopType", "in", input.stopTypes ?? ["---"]))
        .$if(!!input.searchInput, (qb) =>
            qb.where((eb) =>
                eb.or([
                    eb("stops.commonName", "like", input.searchInput ? `%${input.searchInput}%` : "---"),
                    eb("stops.atcoCode", "like", input.searchInput ? `%${input.searchInput}%` : "---"),
                ]),
            ),
        )
        .offset((input.page || 0) * STOPS_PAGE_SIZE)
        .limit(STOPS_PAGE_SIZE)
        .execute();

    return stops;
};

// export type Stops = Awaited<ReturnType<typeof getStops>>; removed as failing lint when there are more than 4 if statements
export type Stops = {
    id: number;
    atcoCode: string | null;
    naptanCode: string | null;
    commonName: string | null;
    street: string | null;
    indicator: string | null;
    bearing: string | null;
    nptgLocalityCode: string | null;
    localityName: string | null;
    parentLocalityName: string | null;
    longitude: string | null;
    latitude: string | null;
    stopType: string | null;
    busStopType: string | null;
    timingStatus: string | null;
    administrativeAreaCode: string | null;
    status: string | null;
}[];

export type ServiceStop = {
    direction: string;
    sequenceNumber: string;
    journeyPatternId: number;
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
    lineNames?: string[];
};

export const getServicesForOperator = async (dbClient: Kysely<Database>, input: ServicesForOperatorQueryInput) => {
    logger.info("Starting getServicesForOperator...");

    return dbClient
        .selectFrom("services")
        .selectAll()
        .where("nocCode", "=", input.nocCode)
        .where("dataSource", "=", input.dataSource)
        .$if(!!input.modes && input.modes.length > 0, (qb) => qb.where("mode", "in", input.modes ?? []))
        .where((qb) =>
            qb.or([
                qb("services.endDate", "is", null),
                qb(sql`STR_TO_DATE(services.endDate, '%Y-%m-%d')`, ">=", sql`CURDATE()`),
            ]),
        )
        .$if(!!input.lineNames && input.lineNames.length > 0, (qb) =>
            qb.where("services.lineName", "in", input.lineNames ?? []),
        )
        .orderBy("lineName", "asc")
        .orderBy("startDate", "asc")
        .execute();
};

export type ServicesForOperator = Awaited<ReturnType<typeof getServicesForOperator>>;

const getMostRelevantService = <
    T extends {
        id: number;
        startDate: string | null;
        endDate: string | null;
    },
>(
    services: T[],
) => {
    if (services.length === 1) {
        return services[0];
    }

    return (
        services.find((s) => {
            const start = s.startDate ? dayjs(s.startDate, "YYYY-MM-DD") : null;
            const end = s.endDate ? dayjs(s.endDate, "YYYY-MM-DD") : null;
            const currentDate = dayjs();

            return (
                (start && end && currentDate.isBetween(start, end, "date", "[]")) ||
                (!end && start && currentDate.isSameOrAfter(start, "date"))
            );
        }) || services[0]
    );
};

export type ServiceByIdQueryInput = {
    nocCode: string;
    serviceRef: string;
    dataSource: DataSource;
};

export const getServiceById = async (dbClient: Kysely<Database>, input: ServiceByIdQueryInput) => {
    logger.info("Starting getService...");

    const keyToUse = input.dataSource === DataSource.bods ? "services.lineId" : "services.serviceCode";

    const services = await dbClient
        .selectFrom("services")
        .selectAll()
        .where("services.nocCode", "=", input.nocCode)
        .where(keyToUse, "=", input.serviceRef)
        .where("dataSource", "=", input.dataSource)
        .orderBy("services.startDate", "asc")
        .execute();

    const service = getMostRelevantService(services);

    if (!service?.nocCode) {
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
    nocCodes?: string[];
};

export const getServices = async (dbClient: Kysely<Database>, input: ServicesQueryInput) => {
    logger.info("Starting getServices...");

    const SERVICES_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 200 : 2000;

    const services = await dbClient
        .selectFrom("services")
        .selectAll(["services"])
        .where("services.dataSource", "=", input.dataSource)
        .$if(!!input.modes?.[0], (qb) => qb.where("services.mode", "in", input.modes ?? ["---"]))
        .$if(!!input.nocCodes?.[0], (qb) => qb.where("services.nocCode", "in", input.nocCodes ?? ["---"]))
        .$if(!!input.adminAreaCodes?.[0], (qb) =>
            qb
                .innerJoin("service_admin_area_codes", "service_admin_area_codes.serviceId", "services.id")
                .where("service_admin_area_codes.adminAreaCode", "in", input.adminAreaCodes ?? []),
        )
        .where((qb) =>
            qb.or([
                qb("services.endDate", "is", null),
                qb(sql`STR_TO_DATE(services.endDate, '%Y-%m-%d')`, ">=", sql`CURDATE()`),
            ]),
        )
        .offset((input.page || 0) * SERVICES_PAGE_SIZE)
        .limit(SERVICES_PAGE_SIZE)
        .execute();

    return services;
};

export type ServiceJourneysQueryInput = {
    serviceRef: string;
    dataSource: DataSource;
    page?: number;
};

export type ServiceJourneys = {
    serviceId: number | null;
    dataSource: string | null;
    journeyCode: string | null;
    vehicleJourneyCode: string | null;
    departureTime: string | null;
    destination: string | null;
    origin: string | null;
    direction: string | null;
}[];

export const getServiceJourneys = async (
    dbClient: Kysely<Database>,
    input: ServiceJourneysQueryInput,
): Promise<ServiceJourneys> => {
    logger.info("Starting getServiceJourneys...");

    const keyToUse = input.dataSource === DataSource.bods ? "services.lineId" : "services.serviceCode";

    const JOURNEY_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 100 : 1000;

    const services = await dbClient
        .selectFrom("services")
        .select(["id", "startDate", "endDate"])
        .where(keyToUse, "=", input.serviceRef)
        .where("dataSource", "=", input.dataSource)
        .execute();

    if (!services.length) {
        return [];
    }

    const service = getMostRelevantService(services);

    const journeys = await dbClient
        .selectFrom("services")
        .innerJoin("service_journey_patterns", "service_journey_patterns.operatorServiceId", "services.id")
        .innerJoin("vehicle_journeys", (join) =>
            join
                .onRef("vehicle_journeys.operatorServiceId", "=", "services.id")
                .onRef("vehicle_journeys.journeyPatternRef", "=", "service_journey_patterns.journeyPatternRef"),
        )
        .select([
            "services.id as serviceId",
            "services.dataSource as dataSource",
            "vehicle_journeys.journeyCode",
            "vehicle_journeys.vehicleJourneyCode",
            "vehicle_journeys.departureTime",
            "services.destination",
            "services.origin",
            "service_journey_patterns.direction",
        ])
        .distinct()
        .where("services.id", "=", service.id)
        .where("dataSource", "=", input.dataSource)
        .offset((input.page || 0) * JOURNEY_PAGE_SIZE)
        .limit(JOURNEY_PAGE_SIZE)
        .execute();

    return journeys;
};

export type Services = Awaited<ReturnType<typeof getServices>>;

export type ServiceStopsQueryInput = {
    serviceRef: string;
    dataSource: DataSource;
    modes?: VehicleMode[];
    stopTypes?: string[];
    adminAreaCodes?: string[];
    useTracks?: boolean;
};

export const getServiceStops = async (
    dbClient: Kysely<Database>,
    input: ServiceStopsQueryInput,
): Promise<ServiceStops | ServiceTracks> => {
    logger.info("Starting getServiceStops...");

    const keyToUse = input.dataSource === DataSource.bods ? "services.lineId" : "services.serviceCode";

    const services = await dbClient
        .selectFrom("services")
        .select(["id", "startDate", "endDate"])
        .where(keyToUse, "=", input.serviceRef)
        .where("dataSource", "=", input.dataSource)
        .execute();

    if (!services.length) {
        return [];
    }

    const service = getMostRelevantService(services);

    if (input.useTracks) {
        const tracks = await dbClient
            .selectFrom("tracks")
            .select(["operatorServiceId as serviceId", "longitude", "latitude"])
            .where("operatorServiceId", "=", service.id)
            .execute();

        if (tracks && tracks.length > 0) {
            return tracks;
        }
    }

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
        .$if(!!input.adminAreaCodes?.[0], (qb) =>
            qb
                .innerJoin("service_admin_area_codes", "service_admin_area_codes.serviceId", "services.id")
                .where("service_admin_area_codes.adminAreaCode", "in", input.adminAreaCodes ?? []),
        )
        .select([
            "services.id as serviceId",
            "services.dataSource as dataSource",
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
            "service_journey_pattern_links.toSequenceNumber",
            "service_journey_pattern_links.orderInSequence",
            "service_journey_pattern_links.fromSequenceNumber",
            "service_journey_pattern_links.journeyPatternId",
            "service_journey_patterns.direction",
        ])
        .distinct()
        .groupBy(["fromId", "toId"])
        .where("services.id", "=", service.id)
        .where("dataSource", "=", input.dataSource)
        .where("fromStop.stopType", "not in", ignoredStopTypes)
        .where("toStop.stopType", "not in", ignoredStopTypes)
        .where("fromStop.busStopType", "not in", ignoredBusStopTypes)
        .where("toStop.busStopType", "not in", ignoredBusStopTypes)
        .where((qb) => qb.or([qb("fromStop.status", "=", "active"), qb("toStop.status", "=", "active")]))
        .$if(!!input.modes?.[0], (qb) => qb.where("services.mode", "in", input.modes ?? ["---"]))
        .orderBy("service_journey_pattern_links.orderInSequence")
        .orderBy("service_journey_pattern_links.journeyPatternId")
        .execute();

    return stops;
};

export type ServiceTracks = {
    serviceId: number;
    longitude: string;
    latitude: string;
}[];

// Unable to use Awaited due to error: Type instantiation is excessively deep and possibly infinite.
export type ServiceStops = {
    serviceId: number;
    dataSource: "bods" | "tnds";
    fromId: number;
    fromAtcoCode: string;
    fromNaptanCode: string | null;
    fromCommonName: string | null;
    fromStreet: string | null;
    fromIndicator: string | null;
    fromBearing: string | null;
    fromNptgLocalityCode: string | null;
    fromLocalityName: string | null;
    fromParentLocalityName: string | null;
    fromLongitude: string | null;
    fromLatitude: string | null;
    fromStopType: string | null;
    fromBusStopType: string | null;
    fromTimingStatus: string | null;
    fromAdministrativeAreaCode: string | null;
    fromStatus: string | null;
    toId: number;
    toAtcoCode: string;
    toNaptanCode: string | null;
    toCommonName: string | null;
    toStreet: string | null;
    toIndicator: string | null;
    toBearing: string | null;
    toNptgLocalityCode: string | null;
    toLocalityName: string | null;
    toParentLocalityName: string | null;
    toLongitude: string | null;
    toLatitude: string | null;
    toStopType: string | null;
    toBusStopType: string | null;
    toTimingStatus: string | null;
    toAdministrativeAreaCode: string | null;
    toStatus: string | null;
    fromSequenceNumber: string | null;
    toSequenceNumber: string | null;
    journeyPatternId: number;
    orderInSequence: number;
    direction: string | null;
}[];

export type ServicesByStopsQueryInput = {
    dataSource: DataSource;
    page: number;
    stops: string[];
    modes?: VehicleMode[];
    includeRoutes: boolean;
    adminAreaCodes?: string[];
    nocCodes?: string[];
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
        .$if(!!input.adminAreaCodes?.[0], (qb) =>
            qb
                .innerJoin("service_admin_area_codes", "service_admin_area_codes.serviceId", "services.id")
                .where("service_admin_area_codes.adminAreaCode", "in", input.adminAreaCodes ?? []),
        )
        .$if(!!input.nocCodes?.[0], (qb) => qb.where("services.nocCode", "in", input.nocCodes ?? ["---"]))
        .selectAll("services")
        .select(["fromAtcoCode", "toAtcoCode"])
        .distinct()
        .where((qb) => qb.or([qb("fromAtcoCode", "in", input.stops), qb("toAtcoCode", "in", input.stops)]))
        .where("dataSource", "=", input.dataSource)
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

export const getAdminAreas = async (dbClient: Kysely<Database>) => {
    logger.info("Starting getAdminAreas...");

    const areaCodes = await dbClient
        .selectFrom("nptg_admin_areas")
        .select(["administrativeAreaCode", "name", "shortName"])
        .distinct()
        .execute();

    return areaCodes;
};

export type AdminAreas = Awaited<ReturnType<typeof getAdminAreas>>;

export type RoadworksQueryInput = {
    adminAreaCodes?: string[];
    page?: number;
    lastUpdatedTimeDelta?: number | null;
    createdTimeDelta?: number | null;
    permitStatus?: PermitStatus | null;
};

export const getRoadworks = async (dbClient: Kysely<Database>, input: RoadworksQueryInput) => {
    logger.info("Starting getRoadworks...");

    const ROADWORKS_PAGE_SIZE = process.env.IS_LOCAL === "true" ? 50 : 2000;

    return dbClient
        .selectFrom("roadworks")
        .innerJoin(
            "highway_authority_admin_areas",
            "highway_authority_admin_areas.highwayAuthoritySwaCode",
            "roadworks.highwayAuthoritySwaCode",
        )
        .$if(!!input.adminAreaCodes && input.adminAreaCodes.length > 0, (qb) =>
            qb.where("highway_authority_admin_areas.administrativeAreaCode", "in", input.adminAreaCodes ?? []),
        )
        .$if(!!input.permitStatus, (qb) => qb.where("roadworks.permitStatus", "=", input.permitStatus ?? null))
        .$if(!!input.lastUpdatedTimeDelta, (qb) =>
            qb.where(
                "roadworks.lastUpdatedDatetime",
                ">=",
                sql<string>`DATE_SUB(NOW(), INTERVAL ${input.lastUpdatedTimeDelta} MINUTE)`,
            ),
        )
        .$if(!!input.createdTimeDelta, (qb) =>
            qb.where(
                "roadworks.createdDateTime",
                ">=",
                sql<string>`DATE_SUB(NOW(), INTERVAL ${input.createdTimeDelta} MINUTE)`,
            ),
        )
        .select([
            "roadworks.permitReferenceNumber",
            "roadworks.highwayAuthoritySwaCode",
            "roadworks.streetName",
            "roadworks.areaName",
            "roadworks.town",
            "roadworks.worksLocationCoordinates",
            "roadworks.activityType",
            "roadworks.proposedStartDateTime",
            "roadworks.proposedEndDateTime",
            "roadworks.actualStartDateTime",
            "roadworks.actualEndDateTime",
            "roadworks.permitStatus",
            "roadworks.workStatus",
            "highway_authority_admin_areas.administrativeAreaCode",
        ])
        .distinct()
        .orderBy("roadworks.proposedStartDateTime")
        .offset((input.page || 0) * ROADWORKS_PAGE_SIZE)
        .limit(ROADWORKS_PAGE_SIZE)
        .execute();
};

export type RoadworkByIdQueryInput = {
    permitReferenceNumber: string;
};

export const getRoadworkById = async (dbClient: Kysely<Database>, input: RoadworkByIdQueryInput) => {
    logger.info("Starting getRoadworkById...");

    return dbClient
        .selectFrom("roadworks")
        .innerJoin(
            "highway_authority_admin_areas",
            "highway_authority_admin_areas.highwayAuthoritySwaCode",
            "roadworks.highwayAuthoritySwaCode",
        )
        .where("roadworks.permitReferenceNumber", "=", input.permitReferenceNumber)
        .select([
            "roadworks.permitReferenceNumber",
            "roadworks.highwayAuthoritySwaCode",
            "roadworks.highwayAuthority",
            "roadworks.streetName",
            "roadworks.areaName",
            "roadworks.town",
            "roadworks.worksLocationCoordinates",
            "roadworks.activityType",
            "roadworks.workCategory",
            "roadworks.trafficManagementType",
            "roadworks.proposedStartDateTime",
            "roadworks.proposedEndDateTime",
            "roadworks.actualStartDateTime",
            "roadworks.actualEndDateTime",
            "roadworks.permitStatus",
            "roadworks.workStatus",
            "highway_authority_admin_areas.administrativeAreaCode",
            "roadworks.createdDateTime",
            "roadworks.lastUpdatedDatetime",
        ])
        .distinct()
        .executeTakeFirst();
};

export type Roadworks = Awaited<ReturnType<typeof getRoadworks>>;
