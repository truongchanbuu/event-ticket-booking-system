import { vi } from "vitest";

// Mock ../src/libs/index.js (idempotency & rate-limit) để test ổn định
vi.mock("../src/libs/index.js", () => {
    const idem = new Map();
    return {
        getIdemCached: async (_r, key) => idem.get(key) || null,
        setIdemPending: async (_r, key) => {
            idem.set(key, { status: "pending" });
            return "OK";
        },
        setIdemFinal: async (_r, key, statusCode, body) => {
            idem.set(key, { status: "done", statusCode, body });
            return "OK";
        },
        rateLimitOncePerMinute: async () => ({
            allowed: true,
            retryAfterSec: 0,
        }),
    };
});
