import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBankHolidaysAndUploadToS3, main } from ".";
import { putS3Object } from "./s3";

const mockBankHolidaysResponse = {
    "england-and-wales": {
        division: "england-and-wales",
        events: [
            { title: "Christmas Day", date: "2026-12-25", notes: "", bunting: true },
            { title: "Boxing Day", date: "2026-12-28", notes: "Substitute day", bunting: true },
        ],
    },
    scotland: {
        division: "scotland",
        events: [
            { title: "Christmas Day", date: "2026-12-25", notes: "", bunting: true },
            { title: "Boxing Day", date: "2026-12-28", notes: "Substitute day", bunting: true },
        ],
    },
    "northern-ireland": {
        division: "northern-ireland",
        events: [
            { title: "Christmas Day", date: "2026-12-25", notes: "", bunting: true },
            { title: "Boxing Day", date: "2026-12-28", notes: "Substitute day", bunting: true },
        ],
    },
};

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("getBankHolidaysAndUploadToS3", () => {
    vi.mock("./s3", () => ({
        putS3Object: vi.fn(),
    }));

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("should retrieve bank holiday data and upload it to S3", async () => {
        mockedAxios.get.mockResolvedValue({ status: 200, data: mockBankHolidaysResponse });
        await getBankHolidaysAndUploadToS3("test-bucket");

        expect(putS3Object).toBeCalled();
        expect(putS3Object).toBeCalledWith({
            Bucket: "test-bucket",
            Key: "bank-holidays.json",
            ContentType: "application/json",
            Body: JSON.stringify(mockBankHolidaysResponse),
        });
    });

    it("should throw an error when it gets no data from axios", async () => {
        mockedAxios.get.mockResolvedValue({ status: 200, data: undefined });

        await expect(() => getBankHolidaysAndUploadToS3("test-bucket")).rejects.toThrow(
            "Did not receive any data from bank holidays url",
        );
    });

    it("should throw an error when it gets an empty data object from axios", async () => {
        mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

        await expect(() => getBankHolidaysAndUploadToS3("test-bucket")).rejects.toThrow(
            "Did not receive any data from bank holidays url",
        );
    });
});

describe("main", () => {
    it("should throw an error if bucket name is not set", async () => {
        await expect(() => main()).rejects.toThrow("Missing env vars - BANK_HOLIDAYS_BUCKET_NAME must be set");
    });
});
