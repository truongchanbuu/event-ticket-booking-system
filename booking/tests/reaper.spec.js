import { describe, it, expect, beforeEach } from "vitest";
import { FakeRedis } from "./helpers/fakeRedis.js";
import { EventInventoryMock } from "./helpers/mocks.js";
import { ReservationReaper } from "../src/scripts/reservation.reaper.js";

describe("ReservationReaper", () => {
    let redis, eventInv, reaper;

    beforeEach(() => {
        redis = new FakeRedis();
        eventInv = new EventInventoryMock({ TT_A: 5 });
        reaper = new ReservationReaper({
            redisClient: redis,
            eventInventoryClient: eventInv,
            logger: console,
            config: {
                reaper: {
                    enabled: true,
                    batchSize: 100,
                    tickMs: 100,
                    lockTtl: 5,
                },
            },
        });
    });

    it("releases expired holds and cleans keys", async () => {
        const reservationId = "RSV_TEST";
        const hold = {
            v: 1,
            reservationId,
            eventId: "EV1",
            userId: "U1",
            lines: [{ ttId: "TT_A", qty: 2, shardIndex: 0 }],
            expiresAt: Date.now() - 1000,
            ttlSec: 120,
            createdAt: Date.now(),
            client: { ip: "1.1.1.1" },
            slug: `reservation:${reservationId}`,
        };

        await redis.setex(`hold:${reservationId}`, 120, JSON.stringify(hold));
        await redis.zadd("hold_expiries", hold.expiresAt, reservationId);
        await redis.set(`user_hold:U1:EV1`, reservationId, "NX", "EX", 120);
        await eventInv.reserve("TT_A", { qty: 2 });

        // run one tick
        await reaper._tick();

        // inventory restored
        expect(eventInv.remaining("TT_A")).toBe(5);
        // hold cleared
        const hv = await redis.get(`hold:${reservationId}`);
        expect(hv).toBeNull;
        // zset removed
        const zs = await redis.zrangebyscore(
            "hold_expiries",
            0,
            Date.now() + 1e9,
            "LIMIT",
            0,
            10,
        );
        expect(zs).not.toContain(reservationId);
        // user_hold removed
        const uh = await redis.get(`user_hold:U1:EV1`);
        expect(uh).toBeNull;
    });
});
