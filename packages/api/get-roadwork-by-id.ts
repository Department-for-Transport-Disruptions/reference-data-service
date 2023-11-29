import { APIGatewayEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { RoadworkByIdQueryInput, getRoadworkById } from "./client";
import { ClientError } from "./error";
import { executeClient } from "./execute-client";

export const main = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> =>
    executeClient(event, getQueryInput, getRoadworkById);

export const getQueryInput = (event: APIGatewayEvent): RoadworkByIdQueryInput => {
    const { pathParameters } = event;

    const permitReferenceNumber = pathParameters?.permitReferenceNumber ?? "";

    if (!permitReferenceNumber) {
        throw new ClientError("permitReferenceNumber is required to get a roadwork by Id");
    }

    return {
        permitReferenceNumber: permitReferenceNumber,
    };
};
