import { Database, getDbClient, Tables } from "@reference-data-service/core/db";
import { Kysely, sql } from "kysely";
import * as logger from "lambda-log";
import { SSMClient, PutParameterCommand, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: "eu-west-2" });

export const main = async () => {
    try {
        logger.info("Table Renamer starting... ");

        const dbClient = getDbClient();

        let disableRenamer = "true";
        try {
            const input = {
                Name: "/scheduled/disable-table-renamer",
            };
            const command = new GetParameterCommand(input);
            const ssmOutput = await ssm.send(command);
            disableRenamer = ssmOutput.Parameter.Value;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get parameter from ssm: ${error.stack || ""}`);
            }

            throw error;
        }

        if (disableRenamer === "false") {
            await checkReferenceDataImportHasCompleted("operator_lines", dbClient);
            await checkReferenceDataImportHasCompleted("operator_public_data", dbClient);
            await checkReferenceDataImportHasCompleted("operators", dbClient);
            await checkReferenceDataImportHasCompleted("stops", dbClient);
            await checkReferenceDataImportHasCompleted("services", dbClient);

            await deleteAndRenameTables(dbClient);
        } else {
            throw new Error(
                "The SSM Parameter used to check for errors in the scheduled job has returned TRUE indicating an issue",
            );
        }
        await putParameter("/scheduled/disable-table-renamer", "false");
    } catch (e) {
        await putParameter("/scheduled/disable-table-renamer", "false");
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

const putParameter = async (key: string, value: string) => {
    try {
        const input = {
            Name: key,
            Value: value,
            Type: "String",
            Overwrite: true,
        };
        const command = new PutParameterCommand(input);
        await ssm.send(command);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(error);
        }
    }
};

export const checkReferenceDataImportHasCompleted = async (tableName: Tables, db: Kysely<Database>): Promise<void> => {
    logger.info(`Check if reference data import has completed for table ${tableName}`);
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
    "service_admin_area_codes",
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
