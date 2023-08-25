import { AdminAreas, getAdminAreas } from "./client";
import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { executeClientWithoutInput } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClientWithoutInput(event, getAdminAreas, sortAdminAreas);

// eslint-disable-next-line @typescript-eslint/require-await
export const sortAdminAreas = async (adminAreas: AdminAreas) =>
    adminAreas.sort((a, b) => a.administrativeAreaCode.localeCompare(b.administrativeAreaCode));
