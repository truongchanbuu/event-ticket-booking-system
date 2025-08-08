// __tests__/availability.reserve.release.test.js
const { AvailabilityService } = require("../src/services/availability.service");

function mkRedis() {
    return {
        evalsha: jest.fn(),
        scriptLoad: jest.fn().mockResolvedValue("sha-xxx"),
    };
}
function mkEvents() {
    return { getPublicEventDetail: jest.fn() };
}

describe("reserve/release via Lua", () => {
    test("reserve ok vs not enough", async () => {
        const redis = {
            evalsha: jest.fn(),
            scriptLoad: jest.fn().mockResolvedValue("sha-xxx"),
        };
        const svc = new AvailabilityService({
            redisService: redis,
            eventService: { getPublicEventDetail: jest.fn() },
            logger: console,
            config: { availability: { serverCacheTtlMs: 0 } },
        });

        await svc.initialize({
            reserveLua: "--reserve",
            releaseLua: "--release",
        });

        // ok path: Lua returns {1, newRemaining}
        redis.evalsha.mockResolvedValueOnce([1, 2]); // reserve ok -> newRemaining=2
        const ok = await svc.reserve("tt1", 3);
        expect(ok).toEqual({ ok: true, newRemaining: 2 });

        // not enough
        redis.evalsha.mockResolvedValueOnce([0, 2]);
        const fail = await svc.reserve("tt1", 3);
        expect(fail).toEqual({ ok: false, currentRemaining: 2 });
    });

    test("release increments", async () => {
        const redis = {
            evalsha: jest.fn(),
            scriptLoad: jest.fn().mockResolvedValue("sha-xxx"),
        };
        const svc = new AvailabilityService({
            redisService: redis,
            eventService: { getPublicEventDetail: jest.fn() },
            logger: console,
            config: { availability: { serverCacheTtlMs: 0 } },
        });

        await svc.initialize({
            reserveLua: "--reserve",
            releaseLua: "--release",
        });

        // release
        redis.evalsha.mockResolvedValueOnce([1, 9]);
        const rel = await svc.release("tt1", 2);
        expect(rel).toEqual({ ok: true, newRemaining: 9 });
    });
});
