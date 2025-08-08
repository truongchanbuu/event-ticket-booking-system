// __tests__/availability.service.test.js
const { AvailabilityService } = require("../src/services/availability.service");

function mkRedis() {
    return {
        mgetRaw: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
    };
}
function mkEvents() {
    return {
        getPublicEventDetail: jest.fn(),
    };
}

describe("AvailabilityService.getAvailabilityBySlug", () => {
    let redis, events, svc, logger;

    beforeEach(() => {
        redis = mkRedis();
        events = mkEvents();
        logger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };
        svc = new AvailabilityService({
            redisService: redis,
            eventService: events,
            logger,
            config: { availability: { serverCacheTtlMs: 0 } },
        });
    });

    test("404 when event not found", async () => {
        events.getPublicEventDetail.mockResolvedValue(null);
        const r = await svc.getAvailabilityBySlug("nope");
        expect(r.status).toBe(404);
        expect(redis.mgetRaw).not.toHaveBeenCalled();
    });

    test("200 empty array when no ticket types", async () => {
        events.getPublicEventDetail.mockResolvedValue({
            eventID: "ev1",
            ticketTypes: [],
        });
        const r = await svc.getAvailabilityBySlug("ok");
        expect(r.status).toBe(200);
        expect(r.data).toEqual([]);
        expect(redis.mgetRaw).not.toHaveBeenCalled();
    });

    test("returns availability mapped from MGET (sold out)", async () => {
        events.getPublicEventDetail.mockResolvedValue({
            eventID: "ev1",
            ticketTypes: [{ ticketTypeID: "tt1" }, { ticketTypeID: "tt2" }],
        });
        redis.mgetRaw.mockResolvedValue(["7", "0"]); // inv:tt1=7, inv:tt2=0

        const r = await svc.getAvailabilityBySlug("slug-1");
        expect(r.status).toBe(200);
        expect(redis.mgetRaw).toHaveBeenCalledTimes(1);
        expect(r.data).toEqual([
            { ticketTypeId: "tt1", available: 7, isSoldOut: false },
            { ticketTypeId: "tt2", available: 0, isSoldOut: true },
        ]);
    });

    test("server-side cache (hit)", async () => {
        svc = new AvailabilityService({
            redisService: redis,
            eventService: events,
            logger,
            config: { availability: { serverCacheTtlMs: 5000 } },
        });
        // cache hit
        redis.get.mockResolvedValue({
            status: 200,
            data: [{ ticketTypeId: "ttX", available: 1, isSoldOut: false }],
        });

        const r = await svc.getAvailabilityBySlug("slug-cached");
        expect(redis.get).toHaveBeenCalledWith("availability:slug:slug-cached");
        expect(r.status).toBe(200);
        expect(redis.mgetRaw).not.toHaveBeenCalled();
        expect(redis.set).not.toHaveBeenCalled();
    });

    test("server-side cache (miss then set)", async () => {
        svc = new AvailabilityService({
            redisService: redis,
            eventService: events,
            logger,
            config: { availability: { serverCacheTtlMs: 5000 } },
        });
        redis.get.mockResolvedValue(null);
        events.getPublicEventDetail.mockResolvedValue({
            eventID: "ev1",
            ticketTypes: [{ ticketTypeID: "tt1" }],
        });
        redis.mgetRaw.mockResolvedValue(["3"]);

        const r = await svc.getAvailabilityBySlug("slug-miss");
        expect(r.status).toBe(200);
        expect(redis.set).toHaveBeenCalledTimes(1);
        const [ck, val, opts] = redis.set.mock.calls[0];
        expect(ck).toBe("availability:slug:slug-miss");
        expect(opts.ttl).toBe(5); // 5000ms/1000
        expect(val.data[0]).toEqual({
            ticketTypeId: "tt1",
            available: 3,
            isSoldOut: false,
        });
    });
});
