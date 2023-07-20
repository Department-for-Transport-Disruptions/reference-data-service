import { RDSData } from "@aws-sdk/client-rds-data";
import { Generated, Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";

export interface StopsTable {
    id: number;
    atcoCode: string;
    naptanCode: string | null;
    plateCode: string | null;
    cleardownCode: string | null;
    commonName: string | null;
    commonNameLang: string | null;
    shortCommonName: string | null;
    shortCommonNameLang: string | null;
    landmark: string | null;
    landmarkLang: string | null;
    street: string | null;
    streetLang: string | null;
    crossing: string | null;
    crossingLang: string | null;
    indicator: string | null;
    indicatorLang: string | null;
    bearing: string | null;
    nptgLocalityCode: string | null;
    localityName: string | null;
    parentLocalityName: string | null;
    grandParentLocalityName: string | null;
    town: string | null;
    townLang: string | null;
    suburb: string | null;
    suburbLang: string | null;
    localityCentre: string | null;
    gridType: string | null;
    easting: string | null;
    northing: string | null;
    longitude: string | null;
    latitude: string | null;
    stopType: string | null;
    busStopType: string | null;
    timingStatus: string | null;
    defaultWaitTime: string | null;
    notes: string | null;
    notesLang: string | null;
    administrativeAreaCode: string | null;
    creationDateTime: string | null;
    modificationDateTime: string | null;
    revisionNumber: string | null;
    modification: string | null;
    status: string | null;
}

export interface OperatorsTable {
    id: Generated<number>;
    nocCode: string;
    operatorPublicName: string | null;
    vosaPsvLicenseName: string | null;
    opId: string | null;
    pubNmId: string | null;
    nocCdQual: string | null;
    changeDate: string | null;
    changeAgent: string | null;
    changeComment: string | null;
    dateCeased: string | null;
    dataOwner: string | null;
}

export interface OperatorLinesTable {
    id: Generated<number>;
    nocLineNo: string;
    nocCode: string | null;
    pubNm: string | null;
    refNm: string | null;
    licence: string | null;
    mode: string | null;
    tlRegOwn: string | null;
    ebsrAgent: string | null;
    lo: string | null;
    sw: string | null;
    wm: string | null;
    wa: string | null;
    yo: string | null;
    nw: string | null;
    ne: string | null;
    sc: string | null;
    se: string | null;
    ea: string | null;
    em: string | null;
    ni: string | null;
    nx: string | null;
    megabus: string | null;
    newBharat: string | null;
    terravision: string | null;
    ncsd: string | null;
    easybus: string | null;
    yorksRt: string | null;
    travelEnq: string | null;
    comment: string | null;
    auditDate: string | null;
    auditEditor: string | null;
    auditComment: string | null;
    duplicate: string | null;
    dateCeased: string | null;
    cessationComment: string | null;
}

export interface OperatorPublicDataTable {
    id: Generated<number>;
    pubNmId: string;
    operatorPublicName: string | null;
    pubNmQual: string | null;
    ttrteEnq: string | null;
    fareEnq: string | null;
    lostPropEnq: string | null;
    disruptEnq: string | null;
    complEnq: string | null;
    twitter: string | null;
    facebook: string | null;
    linkedin: string | null;
    youtube: string | null;
    changeDate: string | null;
    changeAgent: string | null;
    changeComment: string | null;
    ceasedDate: string | null;
    dataOwner: string | null;
    website: string | null;
}

export interface ServicesTable {
    id: Generated<number>;
    nocCode: string | null;
    lineName: string | null;
    startDate: string | null;
    operatorShortName: string | null;
    serviceDescription: string | null;
    serviceCode: string | null;
    regionCode: string | null;
    dataSource: "bods" | "tnds";
    origin: string | null;
    destination: string | null;
    lineId: string | null;
    endDate: string | null;
    inboundDirectionDescription: string | null;
    outboundDirectionDescription: string | null;
    mode: string | null;
}

export interface ServiceJourneyPatternsTable {
    id: Generated<number>;
    operatorServiceId: number;
    destinationDisplay: string | null;
    direction: string | null;
    routeRef: string | null;
    journeyPatternRef: string | null;
    sectionRefs: string | null;
}

export interface ServiceJourneyPatternLinksTable {
    id: Generated<number>;
    journeyPatternId: number;
    fromAtcoCode: string;
    fromTimingStatus: string | null;
    toAtcoCode: string;
    toTimingStatus: string | null;
    runtime: string | null;
    orderInSequence: number;
    fromSequenceNumber: string | null;
    toSequenceNumber: string | null;
}

export interface ServiceAdminAreaCodes {
    serviceId: number;
    adminAreaCode: string;
}

export interface VehicleJourneysTable {
    id: number;
    vehicleJourneyCode: string | null;
    serviceRef: string | null;
    lineRef: string | null;
    journeyPatternRef: string | null;
}

export interface LocalitiesTable {
    nptgLocalityCode: string;
    localityName: string | null;
    localityNameLang: string | null;
    shortName: string | null;
    shortNameLang: string | null;
    qualifierName: string | null;
    qualifierNameLang: string | null;
    qualifierLocalityRef: string | null;
    qualifierDistrictRef: string | null;
    parentLocalityName: string | null;
    parentLocalityNameLang: string | null;
    administrativeAreaCode: string;
    nptgDistrictCode: string | null;
    sourceLocalityType: string | null;
    gridType: string | null;
    easting: string | null;
    northing: string | null;
    creationDateTime: string | null;
    modificationDateTime: string | null;
    revisionNumber: string | null;
    modification: string | null;
}
export interface Database {
    stops: StopsTable;
    stops_new?: StopsTable;
    stops_old?: StopsTable;
    operators: OperatorsTable;
    operators_new?: OperatorsTable;
    operators_old?: OperatorsTable;
    operator_lines: OperatorLinesTable;
    operator_lines_new?: OperatorLinesTable;
    operator_lines_old?: OperatorLinesTable;
    operator_public_data: OperatorPublicDataTable;
    operator_public_data_new?: OperatorPublicDataTable;
    operator_public_data_old?: OperatorPublicDataTable;
    services: ServicesTable;
    services_new?: ServicesTable;
    services_old?: ServicesTable;
    service_journey_patterns: ServiceJourneyPatternsTable;
    service_journey_patterns_new?: ServiceJourneyPatternsTable;
    service_journey_patterns_old?: ServiceJourneyPatternsTable;
    service_journey_pattern_links: ServiceJourneyPatternLinksTable;
    service_journey_pattern_links_new?: ServiceJourneyPatternLinksTable;
    service_journey_pattern_links_old?: ServiceJourneyPatternLinksTable;
    service_admin_area_codes: ServiceAdminAreaCodes;
    service_admin_area_codes_new?: ServiceAdminAreaCodes;
    service_admin_area_codes_old?: ServiceAdminAreaCodes;
    localities: LocalitiesTable;
    localities_new?: LocalitiesTable;
    localities_old?: LocalitiesTable;
    vehicle_journeys: VehicleJourneysTable;
    vehicle_journeys_new?: VehicleJourneysTable;
    vehicle_journeys_old?: VehicleJourneysTable;
}

export type Tables =
    | "stops"
    | "operator_lines"
    | "operators"
    | "operator_public_data"
    | "services"
    | "service_journey_patterns"
    | "service_journey_pattern_links"
    | "service_admin_area_codes"
    | "localities"
    | "vehicle_journeys";
export type TablesNew =
    | "stops_new"
    | "operator_lines_new"
    | "operators_new"
    | "operator_public_data_new"
    | "services_new"
    | "service_journey_patterns_new"
    | "service_journey_pattern_links_new"
    | "service_admin_area_codes_new"
    | "localities_new"
    | "vehicle_journeys_new";
export type TablesOld =
    | "stops_old"
    | "operator_lines_old"
    | "operators_old"
    | "operator_public_data_old"
    | "services_old"
    | "service_journey_patterns_old"
    | "service_journey_pattern_links_old"
    | "service_admin_area_codes_old"
    | "localities_old"
    | "vehicle_journeys_old";

export const getDbClient = () => {
    const { DATABASE_NAME: dbName, DATABASE_SECRET_ARN: secretArn, DATABASE_RESOURCE_ARN: resourceArn } = process.env;

    if (!dbName || !secretArn || !resourceArn) {
        throw new Error("Necessary env vars not set");
    }

    return new Kysely<Database>({
        dialect: new DataApiDialect({
            mode: "mysql",
            driver: {
                database: dbName,
                secretArn: secretArn,
                resourceArn: resourceArn,
                client: new RDSData({
                    region: "eu-west-2",
                }),
            },
        }),
    });
};
