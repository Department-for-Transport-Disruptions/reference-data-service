import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["./packages/api/*.{test,spec}.{js,ts,tsx}"],
        threads: false,
        restoreMocks: true,
        mockReset: true,
    },
});
