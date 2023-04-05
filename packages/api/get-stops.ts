import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getStops, StopsQueryInput } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

const MAX_ATCO_CODES = process.env.MAX_ATCO_CODES || "5";
const MAX_NAPTAN_CODES = process.env.MAX_NAPTAN_CODES || "5";
const MAX_ADMIN_AREA_CODES = process.env.MAX_ADMIN_AREA_CODES || "5";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getStops);

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

    const formatPolygon = (polygonToFormat: number[][]): string => {
        // [ [ 1, 1 ], [ 1, 2 ], [ 2, 2 ], [ 2, 1 ] ]
        // [ [ -1.391749786242542, 53.421478425112554 ], [ -1.3731590588747054, 53.422524729977454 ], [ -1.3842102134763934, 53.41353797858062 ], [ -1.391749786242542, 53.42147842511255 ] ]
        // [ [ -1.391749786242542, 53.421478425112554 ], [ -1.3731590588747054, 53.422524729977454 ], [ -1.3842102134763934, 53.41353797858062 ], [ -1.391749786242542, 53.42147842511255 ] ]
        // -1.4848897 53.3942186, -1.3818929 53.3876669,-1.4114186 53.4265529, -1.4848897 53.3942186
        return polygonToFormat.map((coordinate) => `${coordinate[0]} ${coordinate[1]}`).toString();
    };
    const polygon = queryStringParameters?.polygon
        ? `POLYGON((${formatPolygon(JSON.parse(queryStringParameters?.polygon) as number[][])}))`
        : "";
    console.log("polyyy", polygon);
    // [ [ -1.4848897, 53.3942186 ], [ -1.3818929, 53.3876669 ], [ -1.4114186, 53.4265529 ], [-1.4848897, 53.3942186 ] ]
    //[[-1.4848897,53.3942186],[-1.3818929,53.3876669],[-1.4114186,53.4265529],[-1.4848897,53.3942186]]
    return {
        ...(atcoCodes ? { atcoCodes: atcoCodesArray } : {}),
        ...(naptanCodes ? { naptanCodes: naptanCodesArray } : {}),
        ...(commonName ? { commonName } : {}),
        ...(adminAreaCodes ? { adminAreaCodes: adminAreaCodeArray } : {}),
        ...(polygon ? { polygon } : {}),
        page: page - 1,
    };
};
