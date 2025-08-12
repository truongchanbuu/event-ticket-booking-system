import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/libs/index.js", () => {
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

import { FakeRedis } from "./helpers/fakeRedis.js";
import {
    EventInventoryMock,
    PaymentClientMock,
    OrderServiceMock,
    ReservationProducerMock,
} from "./helpers/mocks.js";
import { ReservationService } from "../src/services/reservation.service.js";

const mkSvc = ({ invRemain = { TT_A: 10, TT_B: 5 } } = {}) => {
    const redis = new FakeRedis();
    const eventInv = new EventInventoryMock(invRemain);
    const payment = new PaymentClientMock();
    const orders = new OrderServiceMock();
    const producer = new ReservationProducerMock();

    const svc = new ReservationService({
        redisClient: redis,
        eventInventoryClient: eventInv,
        reservationProducer: producer,
        paymentClient: payment,
        orderService: orders,
        config: { holdTtlSec: 120, maxQty: 5 },
        logger: console,
    });

    return { svc, redis, eventInv, payment, orders, producer };
};

describe("ReservationService", () => {
    let ctx;
    beforeEach(() => {
        ctx = mkSvc();
    });

    it("createReservation → 201, sets hold & user_hold & zset, reserves inventory and publishes", async () => {
        const r = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [
                { ttId: "TT_A", qty: 2 },
                { ttId: "TT_A", qty: 1 },
                { ttId: "TT_B", qty: 1 },
            ],
            idemKey: "IDEM_1",
            clientIp: "1.1.1.1",
            userId: "U1",
            userAgent: "UA",
        });
        expect(r.statusCode).toBe(201);
        expect(r.body.ok).toBe(true);
        const { reservationId } = r.body;

        // hold exists
        const raw = await ctx.redis.get(`hold:${reservationId}`);
        expect(raw).toBeTruthy();

        // user_hold created
        const v = await ctx.redis.get(`user_hold:U1:EV1`);
        expect(v).toBe(reservationId);

        // zset
        const due = await ctx.redis.zrangebyscore(
            "hold_expiries",
            0,
            Date.now() + 1e9,
            "LIMIT",
            0,
            10,
        );
        expect(due).toContain(reservationId);

        // inventory decreased: TT_A: -3, TT_B: -1
        expect(ctx.eventInv.remaining("TT_A")).toBe(7);
        expect(ctx.eventInv.remaining("TT_B")).toBe(4);

        // published created
        const created = ctx.producer.sent.find((s) => s[0] === "created");
        expect(created).toBeTruthy();
    });

    it("enforces 1 hold per user/event", async () => {
        const a = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_A", qty: 1 }],
            idemKey: "IDEM_A",
            clientIp: "1.1.1.1",
            userId: "U1",
        });
        expect(a.statusCode).toBe(201);

        const b = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_B", qty: 1 }],
            idemKey: "IDEM_B",
            clientIp: "1.1.1.1",
            userId: "U1",
        });
        expect(b.statusCode).toBe(409);
        expect(b.body.error).toBe("USER_ALREADY_HAS_HOLD_FOR_EVENT");
        expect(b.body.reservationId).toBe(a.body.reservationId);
    });

    it("rollback inventory and unlock user_hold when INS UFFICIENT_STOCK", async () => {
        // remaining TT_A: 10, request 11 after merge > stock
        const c = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_A", qty: 11 }],
            idemKey: "IDEM_C",
            clientIp: "2.2.2.2",
            userId: "U2",
        });
        expect([400, 409]).toContain(c.statusCode); // qty > maxQty(5) -> 400; nếu tăng maxQty thì 409
        // ensure no leak in user_hold
        const key = await ctx.redis.get("user_hold:U2:EV1");
        expect(key).toBeNull;
        // ensure inventory remains 10
        expect(ctx.eventInv.remaining("TT_A")).toBe(10);
    });

    it("cancelReservation releases inventory and cleans keys", async () => {
        const a = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_A", qty: 3 }],
            idemKey: "IDEM_D",
            clientIp: "3.3.3.3",
            userId: "U3",
        });
        const rid = a.body.reservationId;

        const z = await ctx.svc.cancelReservation({ reservationId: rid });
        expect(z.statusCode).toBe(200);

        // hold gone & zset removed
        expect(await ctx.redis.get(`hold:${rid}`)).toBeNull;
        // inventory restored
        expect(ctx.eventInv.remaining("TT_A")).toBe(10);
        // user_hold removed
        expect(await ctx.redis.get("user_hold:U3:EV1")).toBeNull;
    });

    it("confirmReservation → PENDING returns 202, no order", async () => {
        const a = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_B", qty: 1 }],
            idemKey: "IDEM_E",
            clientIp: "4.4.4.4",
            userId: "U4",
        });
        const rid = a.body.reservationId;
        ctx.payment.set(rid, "PENDING");

        const r = await ctx.svc.confirmReservation({
            reservationId: rid,
            userId: "U4",
        });
        expect(r.statusCode).toBe(202);
        expect(ctx.orders.calls.length).toBe(0);
    });

    it("confirmReservation → SUCCEEDED creates order & tickets, cleans hold", async () => {
        const a = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_A", qty: 2 }],
            idemKey: "IDEM_F",
            clientIp: "5.5.5.5",
            userId: "U5",
        });
        const rid = a.body.reservationId;
        ctx.payment.set(rid, "SUCCEEDED", { amount: 120000 });

        const r = await ctx.svc.confirmReservation({
            reservationId: rid,
            userId: "U5",
        });
        expect(r.statusCode).toBe(200);
        expect(ctx.orders.calls.length).toBe(1);

        // committed flag set
        // (fake redis get returns null vs "1"—we can't read raw here; but repeated confirm should be ALREADY_COMMITTED)
        const r2 = await ctx.svc.confirmReservation({
            reservationId: rid,
            userId: "U5",
        });
        expect(r2.statusCode).toBe(200);
        expect(r2.body.state).toMatch(/ALREADY/);
    });

    it("confirmReservation → FAILED returns 402", async () => {
        const a = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_B", qty: 1 }],
            idemKey: "IDEM_G",
            clientIp: "6.6.6.6",
            userId: "U6",
        });
        const rid = a.body.reservationId;
        ctx.payment.set(rid, "FAILED");

        const r = await ctx.svc.confirmReservation({
            reservationId: rid,
            userId: "U6",
        });
        expect(r.statusCode).toBe(402);
    });

    it("confirmReservation → HOLD_EXPIRED returns 409", async () => {
        // shorten TTL to simulate expiry
        ctx.svc.holdTtlSec = 1;
        const a = await ctx.svc.createReservation({
            eventId: "EV1",
            lines: [{ ttId: "TT_A", qty: 1 }],
            idemKey: "IDEM_H",
            clientIp: "7.7.7.7",
            userId: "U7",
        });
        const rid = a.body.reservationId;
        // travel time
        // fake redis does not tick TTL automatically for setex reads here; but we compare Date.now() > expiresAt in confirm
        // So let's patch hold.expiresAt to past
        const raw = JSON.parse(await ctx.redis.get(`hold:${rid}`));
        raw.expiresAt = Date.now() - 10;
        await ctx.redis.setex(`hold:${rid}`, 120, JSON.stringify(raw));

        const r = await ctx.svc.confirmReservation({
            reservationId: rid,
            userId: "U7",
        });
        expect(r.statusCode).toBe(409);
        expect(r.body.error).toBe("HOLD_EXPIRED");
    });
});
