import { Database, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { randomUUID } from "crypto";
import * as logger from "lambda-log";
import { Kysely, sql } from "kysely";

export const deleteOldRoadworks = async (dbClient: Kysely<Database>) => {
    await dbClient
        .deleteFrom("roadworks")
        .where((qb) =>
            qb.or([
                qb.and([
                    qb(
                        sql`DATE_ADD(DATE_FORMAT(left(actualEndDateTime,10),'%Y-%m-%d'), INTERVAL 7 DAY)`,
                        "<",
                        sql`CURDATE()`,
                    ),
                    qb("permitStatus", "=", "closed"),
                ]),
                qb.and([
                    qb(
                        sql`DATE_ADD(DATE_FORMAT(left(lastUpdatedDateTime,10),'%Y-%m-%d'), INTERVAL 7 DAY)`,
                        "<",
                        sql`CURDATE()`,
                    ),
                    qb.or([
                        qb("permitStatus", "=", "revoked"),
                        qb("permitStatus", "=", "refused"),
                        qb("permitStatus", "=", "cancelled"),
                    ]),
                ]),
                qb.and([
                    qb("workStatus", "=", "Works in progress"),
                    qb.and([
                        qb(
                            sql`STR_TO_DATE(SUBSTRING(proposedEndDateTime, 1, 19), '%Y-%m-%dT%H:%i:%s')`,
                            "<=",
                            sql`DATE_SUB(CURDATE(), INTERVAL 2 MONTH)`,
                        ),
                        qb(
                            sql`STR_TO_DATE(SUBSTRING(lastUpdatedDatetime, 1, 19), '%Y-%m-%dT%H:%i:%s')`,
                            "<=",
                            sql`DATE_SUB(CURDATE(), INTERVAL 2 MONTH)`,
                        ),
                    ]),
                ]),
            ]),
        )
        .execute();
};

export const main = async () => {
    logger.options.dev = process.env.NODE_ENV !== "production";
    logger.options.debug = process.env.ENABLE_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";

    logger.options.meta = {
        id: randomUUID(),
    };

    const dbClient = getDbClient();

    try {
        await waitForDb(dbClient);

        logger.info("Starting Cleanup roadworks");

        await deleteOldRoadworks(dbClient);

        logger.info("Cleanup roadworks complete");
    } catch (e) {
        if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with cleanup roadworks",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with cleanup roadworks",
            }),
        };
    }
};
