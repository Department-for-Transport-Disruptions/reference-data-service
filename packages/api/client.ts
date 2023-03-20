import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";
import { Database } from "@reference-data-service/core/db";

export type OperatorQueryInput = {
    nocCode?: string;
    batchNocCodes?: string[];
    page?: number;
};

export const getOperators = async (dbClient: Kysely<Database>, input: OperatorQueryInput) => {
    logger.info("Starting getOperators...");

    const OPERATORS_PAGE_SIZE = 100;

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

    if (input.batchNocCodes) {
        return dbClient
            .selectFrom("operators")
            .selectAll()
            .where("nocCode", "in", input.batchNocCodes)
            .offset((input.page || 0) * OPERATORS_PAGE_SIZE)
            .limit(OPERATORS_PAGE_SIZE)
            .execute();
    }

    return dbClient
        .selectFrom("operators")
        .selectAll()
        .offset((input.page || 0) * OPERATORS_PAGE_SIZE)
        .limit(OPERATORS_PAGE_SIZE)
        .execute();
};

export type StopsQueryInput = {
    atcoCodes?: string[];
    naptanCodes?: string[];
    commonNames?: string[];
    adminAreaCode?: string;
    page?: number;
};

export const getStops = async (dbClient: Kysely<Database>, input: StopsQueryInput) => {
    logger.info("Starting getStops...");

    const STOPS_PAGE_SIZE = 1000;

    if (input.adminAreaCode) {
        const stopsByAdminAreaCode = await dbClient
            .selectFrom("stops")
            .selectAll()
            .$if(!!(input.atcoCodes || input.naptanCodes || input.commonNames), (qb) =>
                qb
                    .where("naptanCode", "in", input.naptanCodes ?? ["---"])
                    .orWhere("atcoCode", "in", input.atcoCodes ?? ["---"])
                    .orWhere("commonName", "in", input.commonNames ?? ["---"]),
            )
            .where("stops.administrativeAreaCode", "=", input.adminAreaCode)
            .execute();

        if (!stopsByAdminAreaCode) {
            return null;
        }

        return stopsByAdminAreaCode;
    }

    if (input.atcoCodes || input.naptanCodes || input.commonNames) {
        return dbClient
            .selectFrom("stops")
            .selectAll()
            .where((qb) =>
                qb
                    .where("naptanCode", "in", input.naptanCodes ?? ["---"])
                    .orWhere("atcoCode", "in", input.atcoCodes ?? ["---"])
                    .orWhere("commonName", "in", input.commonNames ?? ["---"]),
            )
            .offset((input.page || 0) * STOPS_PAGE_SIZE)
            .limit(STOPS_PAGE_SIZE)
            .execute();
    }

    return dbClient
        .selectFrom("stops")
        .selectAll()
        .offset((input.page || 0) * STOPS_PAGE_SIZE)
        .limit(STOPS_PAGE_SIZE)
        .execute();
};

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

export type ServicesQueryInput = {
    nocCode: string;
    dataSource: DataSource;
    modes?: string[];
};

export const getServices = async (dbClient: Kysely<Database>, input: ServicesQueryInput) => {
    logger.info("Starting getServices...");

    let query = dbClient
        .selectFrom("services")
        .selectAll()
        .where("nocCode", "=", input.nocCode)
        .where("dataSource", "=", input.dataSource)
        .where((qb) => qb.where("services.endDate", "is", null).orWhere("services.endDate", ">=", sql`CURDATE()`))
        .orderBy("lineName", "asc")
        .orderBy("startDate", "asc");

    if (input.modes) {
        query = query.where("mode", "in", input.modes);
    }

    return query.execute();
};

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
        .where((qb) => qb.where("services.endDate", "is", null).orWhere("services.endDate", ">=", sql`CURDATE()`))
        .orderBy("services.startDate", "asc")
        .execute();

    if (!service?.[0]?.nocCode) {
        return null;
    }

    return service;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReturnedPromiseResolvedType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

export type GetServiceByIdResponse = ReturnedPromiseResolvedType<typeof getServiceById>;
