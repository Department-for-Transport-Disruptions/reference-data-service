import { sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await sql`ALTER TABLE roadworks MODIFY worksLocationCoordinates VARCHAR(10000)`.execute(db);
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
    await sql`ALTER TABLE roadworks MODIFY worksLocationCoordinates VARCHAR(255)`.execute(db);
}
