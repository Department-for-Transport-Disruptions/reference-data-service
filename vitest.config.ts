import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.{test,spec}.{js,ts,tsx}"],
        threads: false,
        restoreMocks: true,
        mockReset: true,
    },
});
