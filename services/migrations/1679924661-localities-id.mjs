import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await sql`ALTER TABLE localities DROP PRIMARY KEY`.execute(db);
    await sql`ALTER TABLE localities ADD id INT AUTO_INCREMENT PRIMARY KEY`.execute(db);
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await db.schema.dropTable("localities").execute();
}
