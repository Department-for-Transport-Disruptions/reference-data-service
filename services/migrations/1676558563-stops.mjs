import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await sql`ALTER TABLE stops ADD INDEX idx_commonName (commonName);`.execute(
        db,
    );
    await sql`ALTER TABLE stops ADD INDEX idx_adminAreaCode (administrativeAreaCode);`.execute(
        db,
    );
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {}
