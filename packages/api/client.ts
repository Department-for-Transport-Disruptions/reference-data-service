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

    const OPERATORS_PAGE_SIZE = 1000;

    if (input.nocCode) {
        const services = await dbClient
            .selectFrom("services")
            .select([
                "services.id",
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

        const operators = await dbClient
            .selectFrom("operators")
            .leftJoin("operator_lines", "operator_lines.nocCode", "operators.nocCode")
            .leftJoin("operator_public_data", "operator_public_data.pubNmId", "operators.pubNmId")
            .selectAll(["operators", "operator_lines", "operator_public_data"])
            .where("operators.nocCode", "=", input.nocCode)
            .executeTakeFirst();

        return {
            ...operators,
            services,
        };
    }

    if (input.batchNocCodes) {
        return dbClient
            .selectFrom("operators")
            .selectAll()
            .where("nocCode", "in", input.batchNocCodes)
            .offset(input.page || 0)
            .limit(OPERATORS_PAGE_SIZE)
            .execute();
    }

    return dbClient
        .selectFrom("operators")
        .selectAll()
        .offset(input.page || 0)
        .limit(OPERATORS_PAGE_SIZE)
        .execute();
};
