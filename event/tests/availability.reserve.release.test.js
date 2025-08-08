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
        const redis = mkRedis();
        const svc = new AvailabilityService({
            redisService: redis,
            eventService: mkEvents(),
            logger: console,
            config: { availability: { serverCacheTtlMs: 0 } },
        });

        await svc.initialize({ reserveLua: "--dummy", releaseLua: "--dummy" });

        // ok path: Lua returns {1, newRemaining}
        redis.evalsha.mockResolvedValueOnce([1, 2]); // after reserve -> 2
        const ok = await svc.reserve("tt1", 3);
        expect(ok).toEqual({ ok: true, newRemaining: 2 });

        // not enough: {0, currentRemaining}
        redis.evalsha.mockResolvedValueOnce([0, 2]);
        const fail = await svc.reserve("tt1", 3);
        expect(fail).toEqual({ ok: false, currentRemaining: 2 });
    });

    test("release increments", async () => {
        const redis = mkRedis();
        const svc = new AvailabilityService({
            redisService: redis,
            eventService: mkEvents(),
            logger: console,
            config: { availability: { serverCacheTtlMs: 0 } },
        });
        await svc.initialize({ reserveLua: "--x", releaseLua: "--y" });

        redis.evalsha.mockResolvedValue([1, 9]); // after release -> 9
        const r = await svc.release("tt1", 2);
        expect(r).toEqual({ ok: true, newRemaining: 9 });
    });
});
