// __tests__/reserve.usecase.test.js
function mkRedisClient() {
    return { set: jest.fn() };
}
function mkAvailability() {
    return { reserve: jest.fn() };
}

async function reserveUseCase(
    { redis, availability },
    { attemptId, ticketTypeId, qty },
) {
    const ok = await redis.set(
        `idem:reserve:${attemptId}`,
        "1",
        "NX",
        "EX",
        60,
    );
    if (!ok) return { status: 409, error: "Duplicate attempt" };

    const r = await availability.reserve(ticketTypeId, qty);
    if (!r.ok) return { status: 409, error: "Not enough inventory" };
    return { status: 200, newRemaining: r.newRemaining };
}

describe("Idempotency on reserve", () => {
    test("blocks duplicate attemptId", async () => {
        const redis = mkRedisClient();
        const availability = mkAvailability();

        // first call: NX success
        redis.set.mockResolvedValueOnce("OK");
        availability.reserve.mockResolvedValueOnce({
            ok: true,
            newRemaining: 4,
        });

        const a1 = await reserveUseCase(
            { redis, availability },
            { attemptId: "uuid-1", ticketTypeId: "tt1", qty: 1 },
        );
        expect(a1).toEqual({ status: 200, newRemaining: 4 });

        // second call same attemptId: NX fails
        redis.set.mockResolvedValueOnce(null);
        const a2 = await reserveUseCase(
            { redis, availability },
            { attemptId: "uuid-1", ticketTypeId: "tt1", qty: 1 },
        );
        expect(a2.status).toBe(409);
    });

    test("not enough inventory", async () => {
        const redis = mkRedisClient();
        const availability = mkAvailability();

        redis.set.mockResolvedValueOnce("OK");
        availability.reserve.mockResolvedValueOnce({
            ok: false,
            currentRemaining: 0,
        });

        const r = await reserveUseCase(
            { redis, availability },
            { attemptId: "uuid-2", ticketTypeId: "tt1", qty: 2 },
        );
        expect(r).toEqual({ status: 409, error: "Not enough inventory" });
    });
});
