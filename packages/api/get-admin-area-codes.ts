import { AdminAreaCodes, getAdminAreaCodes } from "./client";
import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { executeClientWithoutInput } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClientWithoutInput(event, getAdminAreaCodes, formatService);

export const formatService = async (areaCodes: AdminAreaCodes): Promise<(string | null)[]> => {
    return await Promise.all(areaCodes.map((areaCode) => areaCode.administrativeAreaCode).sort());
};
