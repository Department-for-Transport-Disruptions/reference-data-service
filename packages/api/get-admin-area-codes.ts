import { AdminAreaCodes, getAdminAreaCodes } from "./client";
import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { executeClientWithoutInput } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClientWithoutInput(event, getAdminAreaCodes, formatService);

// eslint-disable-next-line @typescript-eslint/require-await
export const formatService = async (areaCodes: AdminAreaCodes): Promise<(string | null)[]> => {
    return areaCodes.map((areaCode) => areaCode.administrativeAreaCode).sort();
};
