/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        setupFiles: ["tests/setup.mocks.js"], // mock libs/index.js toàn cục
    },
    resolve: {
        alias: {
            // alias shared package -> mock file
            "@event_ticket_booking_system/shared": path.resolve(
                __dirname,
                "tests/mocks/shared.mock.js",
            ),
        },
    },
});
