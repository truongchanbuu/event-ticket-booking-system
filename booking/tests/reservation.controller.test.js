import { describe, test, expect } from "vitest";
import request from "supertest";
import { FakeRedis as IORedis } from "./helpers/fakeRedis.js";
import { createApp } from "../src/app.js";

import { ReservationRoutes } from "../src/routes/reservation.routes.js";
import { ReservationController } from "../src/controllers/reservation.controller.js";
import { ReservationService } from "../src/services/reservation.service.js";

class FakeEventInventoryClient {
    constructor({ failWhenQtyGt = Infinity } = {}) {
        this.failWhenQtyGt = failWhenQtyGt;
    }
    async reserve(_ttId, { qty }) {
        return qty > this.failWhenQtyGt
            ? { ok: false }
            : { ok: true, shardIndex: 0, version: 1, newRemaining: 0 };
    }
    async release() {
        return { ok: true, newRemaining: 0, version: 1 };
    }
}
class FakeReservationProducer {
    async sendReservationCreated() {}
}

function buildApiRoutes({ redis, inv, producer }) {
    const reservationService = new ReservationService({
        redisClient: redis,
        eventInventoryClient: inv,
        reservationProducer: producer,
        config: { holdTtlSec: 5, maxQty: 5 },
    });
    const reservationController = new ReservationController({
        reservationService,
        logger: console,
    });
    return new ReservationRoutes({ reservationController });
}

describe("POST /checkout/reservations", () => {
    test("201 happy path + idempotent replay", async () => {
        const redis = new IORedis();
        const inv = new FakeEventInventoryClient();
        const producer = new FakeReservationProducer();
        const apiRoutes = buildApiRoutes({ redis, inv, producer });

        const app = createApp({
            apiRoutes,
            config: { app: { nodeEnv: "test" } },
        });

        const idem = "idem-abc";
        const body = { eventId: "EV1", lines: [{ ttId: "TT1", qty: 2 }] };

        const r1 = await request(app)
            .post("/checkout/reservations")
            .set("Idempotency-Key", idem)
            .set("x-user-id", "U1")
            .send(body)
            .expect(201);

        const r2 = await request(app)
            .post("/checkout/reservations")
            .set("Idempotency-Key", idem)
            .set("x-user-id", "U1")
            .send(body)
            .expect(201);

        expect(r2.body).toEqual(r1.body);
        expect(r1.body.ok).toBe(true);
        expect(r1.body.reservationId).toMatch(/^RSV_/);
    });

    test("409 insufficient stock with rollback", async () => {
        const redis = new IORedis();
        const inv = new FakeEventInventoryClient({ failWhenQtyGt: 1 });
        const producer = new FakeReservationProducer();
        const apiRoutes = buildApiRoutes({ redis, inv, producer });

        const app = createApp({
            apiRoutes,
            config: { app: { nodeEnv: "test" } },
        });

        const res = await request(app)
            .post("/checkout/reservations")
            .set("Idempotency-Key", "idem-409")
            .set("x-user-id", "U2")
            .send({ eventId: "EV2", lines: [{ ttId: "TT2", qty: 2 }] })
            .expect(409);

        expect(res.body).toEqual({ ok: false, error: "INSUFFICIENT_STOCK" });
    });
});
