import request from "supertest";
import { describe, it, expect, vi } from "vitest";
import { buildAppForTest } from "./helpers/buildAppForTest.js";
import { makeDoc, makeFirestore } from "./helpers/fakeFirestore.js";
import { makeFakePaymentProducer } from "./helpers/fakeProducer.js";
import { PaymentService } from "../src/services/payment.service.js";
import { PAYMENT_STATUS } from "../src/enums/payment-status.js";

function mkSvcForCtrl(seed) {
    const docRef = makeDoc(seed);
    const db = makeFirestore({ docRef });
    const providerClients = {
        momo: { verify: vi.fn(async () => ({ status: "SUCCESS" })) },
    };
    const paymentProducer = makeFakePaymentProducer(vi);

    const svc = new PaymentService({
        db,
        redisService: { del: vi.fn(), getOrSet: vi.fn() },
        providerClients,
        paymentProducer,
        logger: console,
    });

    return { svc, docRef, providerClients, paymentProducer };
}

describe("POST /internal/payment/confirm", () => {
    it("returns cached terminal", async () => {
        const { svc } = mkSvcForCtrl({
            paymentIntentID: "pi_c1",
            reservationID: "r_c1",
            provider: "momo",
            status: PAYMENT_STATUS.SUCCEEDED,
        });
        const { app } = buildAppForTest({ svc });

        const res = await request(app)
            .post("/internal/payment/confirm")
            .send({ paymentIntentID: "pi_c1" })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.source).toBe("cache");
    });

    it("refreshes when pending", async () => {
        const { svc } = mkSvcForCtrl({
            paymentIntentID: "pi_c2",
            reservationID: "r_c2",
            provider: "momo",
            status: PAYMENT_STATUS.PENDING,
        });
        const { app } = buildAppForTest({ svc });

        const res = await request(app)
            .post("/internal/payment/confirm")
            .send({ paymentIntentID: "pi_c2", refresh: true })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.refreshed).toBe(true);
    });

    it("400 when missing both paymentIntentID and reservationID", async () => {
        const { svc } = mkSvcForCtrl({
            paymentIntentID: "pi_c3",
            reservationID: "r_c3",
            provider: "momo",
            status: PAYMENT_STATUS.PENDING,
        });
        const { app } = buildAppForTest({ svc });

        const res = await request(app)
            .post("/internal/payment/confirm")
            .send({})
            .expect(400);

        expect(res.body.success).toBe(false);
    });
});
