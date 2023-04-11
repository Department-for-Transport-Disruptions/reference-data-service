import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getAreaOfPolygon } from "geolib";
import { z } from "zod";
import { getStops, StopsQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

const MAX_ATCO_CODES = process.env.MAX_ATCO_CODES || "5";
const MAX_NAPTAN_CODES = process.env.MAX_NAPTAN_CODES || "5";
const MAX_ADMIN_AREA_CODES = process.env.MAX_ADMIN_AREA_CODES || "5";
const MAX_POLYGON_AREA = process.env.MAX_POLYGON_AREA ? Number(process.env.MAX_POLYGON_AREA) : 100000000;

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getStops);

const formatPolygon = (polygonToFormat: [number, number][]): string => {
    return polygonToFormat.map((coordinate) => `${coordinate[0]} ${coordinate[1]}`).toString();
};

export const getQueryInput = (event: APIGatewayEvent): StopsQueryInput => {
    const { queryStringParameters } = event;

    const adminAreaCodes = queryStringParameters?.adminAreaCodes ?? "";
    const adminAreaCodeArray = adminAreaCodes
        .split(",")
        .filter((adminAreaCode) => adminAreaCode)
        .map((adminAreaCode) => adminAreaCode.trim());

    if (adminAreaCodeArray.length > Number(MAX_ADMIN_AREA_CODES)) {
        throw new ClientError(`Only up to ${MAX_ADMIN_AREA_CODES} administrative area codes can be provided`);
    }

    const atcoCodes = queryStringParameters?.atcoCodes ?? "";
    const atcoCodesArray = atcoCodes
        .split(",")
        .filter((atcoCode) => atcoCode)
        .map((atcoCode) => atcoCode.trim());

    if (atcoCodesArray.length > Number(MAX_ATCO_CODES)) {
        throw new ClientError(`Only up to ${MAX_ATCO_CODES} ATCO codes can be provided`);
    }

    const naptanCodes = queryStringParameters?.naptanCodes ?? "";
    const naptanCodesArray = naptanCodes
        .split(",")
        .filter((naptanCode) => naptanCode)
        .map((naptanCode) => naptanCode.trim());

    if (naptanCodesArray.length > Number(MAX_NAPTAN_CODES)) {
        throw new ClientError(`Only up to ${MAX_NAPTAN_CODES} NaPTAN codes can be provided`);
    }

    const commonName = queryStringParameters?.search ?? "";

    const page = Number(queryStringParameters?.page ?? "1");

    if (isNaN(page)) {
        throw new ClientError("Provided page is not valid");
    }

    const polygon = queryStringParameters?.polygon;
    let sqlPolygon: string | undefined;

    if (polygon && adminAreaCodeArray.length === 0) {
        throw new ClientError("Admin area codes must be provided when providing a polygon");
    }

    if (polygon) {
        let parsedPolygon: [number, number][];

        try {
            parsedPolygon = z
                .array(z.tuple([z.number(), z.number()]))
                .min(4)
                .parse(JSON.parse(polygon))
                .map((point) => [point[0], point[1]]);
        } catch (e) {
            throw new ClientError("Invalid polygon provided");
        }

        const polygonArea = getAreaOfPolygon(parsedPolygon);

        if (polygonArea > MAX_POLYGON_AREA) {
            throw new ClientError(`Area of polygon must be below ${MAX_POLYGON_AREA / 1000000}km2`);
        }

        sqlPolygon = `POLYGON((${formatPolygon(parsedPolygon)}))`;
    }

    return {
        ...(atcoCodes ? { atcoCodes: atcoCodesArray } : {}),
        ...(naptanCodes ? { naptanCodes: naptanCodesArray } : {}),
        ...(commonName ? { commonName } : {}),
        ...(adminAreaCodes ? { adminAreaCodes: adminAreaCodeArray } : {}),
        ...(sqlPolygon ? { polygon: sqlPolygon } : {}),
        page: page - 1,
    };
};
