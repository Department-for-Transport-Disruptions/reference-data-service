import { promises as fs } from "fs";
import { describe, expect, it, vi, beforeAll, afterEach, beforeEach } from "vitest";
import * as nptgUploader from "./index";
import * as db from "../../core/db";
import { Kysely } from "kysely";

let dropTableMock = vi.fn();

let valuesMock = vi.fn();

let insertMock = vi.fn();

let mockDbClient = {};

let nptgString = "";

describe("nptg-uploader", () => {
    beforeAll(async () => {
        nptgString = await fs.readFile(__dirname + "/../../../test-data/nptg.xml", "utf-8");
    });

    beforeEach(() => {
        dropTableMock = vi.fn().mockImplementation(() => ({
            ifExists: () => ({
                execute: vi.fn(),
            }),
        }));

        valuesMock = vi.fn().mockImplementation(() => ({
            execute: vi.fn().mockResolvedValue(null),
        }));

        insertMock = vi.fn().mockImplementation(() => ({
            values: valuesMock,
        }));

        mockDbClient = {
            schema: {
                dropTable: dropTableMock,
            },
            sql: vi.fn(),
            getExecutor: () => ({
                executeQuery: vi.fn(),
                transformQuery: vi.fn(),
                compileQuery: vi.fn(),
            }),
            executorProvider: {
                getExecutor: vi.fn(),
            },
            insertInto: insertMock,
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("uploads correct admin areas to the database", async () => {
        await nptgUploader.parseNptgAndUpload(nptgString, mockDbClient as unknown as Kysely<db.Database>);

        expect(insertMock).toBeCalledTimes(2);

        expect(insertMock.mock.calls[0]).toStrictEqual(["nptg_admin_areas_new"]);
        expect(valuesMock.mock.calls[0]).toMatchSnapshot();
    });

    it("uploads correct localities to the database", async () => {
        await nptgUploader.parseNptgAndUpload(nptgString, mockDbClient as unknown as Kysely<db.Database>);

        expect(insertMock).toBeCalledTimes(2);

        expect(insertMock.mock.calls[1]).toStrictEqual(["localities_new"]);
        expect(valuesMock.mock.calls[1]).toMatchSnapshot();
    });
});
