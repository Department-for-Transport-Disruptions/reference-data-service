import { AdminAreaCodes, getAdminAreaCodes } from "./client";
import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { executeClientWithoutInput } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClientWithoutInput(event, getAdminAreaCodes, sortAdminAreaCodes);

// eslint-disable-next-line @typescript-eslint/require-await
export const sortAdminAreaCodes = async (areaCodes: AdminAreaCodes) =>
    areaCodes.map((code) => code.administrativeAreaCode).sort();
