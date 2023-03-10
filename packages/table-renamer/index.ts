import { Database, getDbClient, Tables } from "@reference-data-service/core/db";
import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";

export const main = async () => {
    try {
        logger.info("Table Renamer starting... ");

        const dbClient = getDbClient();

        await checkReferenceDataImportHasCompleted("operator_lines", dbClient);
        await checkReferenceDataImportHasCompleted("operator_public_data", dbClient);
        await checkReferenceDataImportHasCompleted("operators", dbClient);
        await checkReferenceDataImportHasCompleted("stops", dbClient);

        await deleteAndRenameTables(dbClient);
    } catch (e) {
        if (e instanceof Error) {
            logger.error(e);

            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "There was a problem with the table renamer",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "There was a problem with the table renamer",
            }),
        };
    }
};

export const checkReferenceDataImportHasCompleted = async (tableName: Tables, db: Kysely<Database>): Promise<void> => {
    const [newCount] = await db.selectFrom(`${tableName}_new`).select(db.fn.count("id").as("count")).execute();

    if (newCount.count === 0) {
        throw new Error(`Reference data import has failed with zero rows in ${tableName}New`);
    }

    const [currentCount] = await db.selectFrom(tableName).select(db.fn.count("id").as("count")).execute();

    const percentageResult = (Number(newCount.count) / Number(currentCount.count)) * 100;

    if (percentageResult < 75) {
        throw new Error(
            `Reference data import has not completed, as only ${percentageResult}% of yesterday's data has been imported for table: ${tableName}`,
        );
    }
};

const tables = [
    "stops",
    "operator_lines",
    "operators",
    "operator_public_data",
    "services",
    "service_journey_patterns",
    "service_journey_pattern_links",
];

export const deleteAndRenameTables = async (db: Kysely<Database>): Promise<void> => {
    try {
        await db.transaction().execute(async () => {
            await sql`SET FOREIGN_KEY_CHECKS=0`.execute(db);

            for (const table of tables) {
                await db.schema.dropTable(`${table}_old`).ifExists().execute();
            }

            await sql`SET FOREIGN_KEY_CHECKS=1`.execute(db);

            for (const table of tables) {
                await db.schema.alterTable(table).renameTo(`${table}_old`).execute();
                await db.schema.alterTable(`${table}_new`).renameTo(table).execute();
            }
        });
    } catch (error) {
        throw error;
    }
};
