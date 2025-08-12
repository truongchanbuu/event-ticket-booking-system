import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["tests/**/*.spec.js"],
        restoreMocks: true,
        clearMocks: true,
    },
    resolve: {
        alias: {
            "@event_ticket_booking_system/shared": path.resolve(
                __dirname,
                "tests/stubs/shared.js",
            ),
        },
    },
});
