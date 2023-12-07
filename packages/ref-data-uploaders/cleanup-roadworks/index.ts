import { Database, getDbClient, waitForDb } from "@reference-data-service/core/db";
import { randomUUID } from "crypto";
import * as logger from "lambda-log";
import { Kysely, sql } from "kysely";

export const deleteOldRoadworks = async (dbClient: Kysely<Database>) => {
    await dbClient
        .deleteFrom("roadworks")
        .where(sql`DATE_ADD(DATE_FORMAT(left(actualEndDateTime,10),'%Y-%m-%d'), INTERVAL 7 DAY)`, "<", sql`CURDATE()`)
        .where((query) =>
            query.or([
                query("permitStatus", "=", "closed"),
                query("permitStatus", "=", "revoked"),
                query("permitStatus", "=", "refused"),
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
