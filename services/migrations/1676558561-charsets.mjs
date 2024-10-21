import { sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
    await sql`SET FOREIGN_KEY_CHECKS = 0;`.execute(db);
    await sql`ALTER DATABASE ref_data CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;`.execute(db);
    await sql`ALTER TABLE stops CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(db);
    await sql`ALTER TABLE operators CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(db);
    await sql`ALTER TABLE operator_lines CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(db);
    await sql`ALTER TABLE operator_public_data CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(
        db,
    );
    await sql`ALTER TABLE services CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(db);
    await sql`ALTER TABLE service_journey_patterns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(
        db,
    );
    await sql`ALTER TABLE service_journey_pattern_links CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.execute(
        db,
    );
    await sql`SET FOREIGN_KEY_CHECKS = 1;`.execute(db);
}

/**
 * @param db {Kysely<any>}
 */
export async function down(_db) {}
