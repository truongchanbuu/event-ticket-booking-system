import { describe, it, expect, vi } from "vitest";
import { makeDoc, makeFirestore } from "./helpers/fakeFirestore.js";
import { makeFakePaymentProducer } from "./helpers/fakeProducer.js";
import { PaymentService } from "../src/services/payment.service.js";
import { PAYMENT_STATUS } from "../src/enums/payment-status.js";

function mkService({
    docData,
    providerResp = {
        status: "SUCCESS",
        transactionId: "momo_txn_1",
        amount: 120000,
        currency: "VND",
    },
    refreshTtlMs = 10_000,
} = {}) {
    const docRef = makeDoc(docData);
    const db = makeFirestore({ docRef });

    const providerClients = {
        momo: { verify: vi.fn(async () => providerResp) },
    };
    const paymentProducer = makeFakePaymentProducer(vi);

    const svc = new PaymentService({
        db,
        redisService: { del: vi.fn(), getOrSet: vi.fn() },
        providerClients,
        paymentProducer,
        logger: console,
        refreshTtlMs,
    });

    return { svc, docRef, providerClients, paymentProducer };
}

describe("PaymentService.confirmByIntent", () => {
    it("returns terminal from cache (no verify call)", async () => {
        const { svc, providerClients } = mkService({
            docData: {
                paymentIntentID: "pi_1",
                reservationID: "r_1",
                provider: "momo",
                status: PAYMENT_STATUS.SUCCEEDED,
            },
        });

        const out = await svc.confirmByIntent({ paymentIntentID: "pi_1" });
        expect(out.source).toBe("cache");
        expect(out.confirmed).toBe(true);
        expect(providerClients.momo.verify).not.toHaveBeenCalled();
    });

    it("pending, within TTL and refresh=false -> no verify", async () => {
        const nowIso = new Date().toISOString();
        const { svc, providerClients } = mkService({
            docData: {
                paymentIntentID: "pi_2",
                reservationID: "r_2",
                provider: "momo",
                status: PAYMENT_STATUS.PENDING,
                lastProviderCheckAt: nowIso,
            },
            refreshTtlMs: 60_000,
        });

        const out = await svc.confirmByIntent({
            paymentIntentID: "pi_2",
            refresh: false,
        });
        expect(out.refreshed).toBe(false);
        expect(providerClients.momo.verify).not.toHaveBeenCalled();
    });

    it("pending, refresh=true -> verify, update, publish succeeded", async () => {
        const { svc, providerClients, paymentProducer, docRef } = mkService({
            docData: {
                paymentIntentID: "pi_3",
                reservationID: "r_3",
                provider: "momo",
                status: PAYMENT_STATUS.PENDING,
                amount: 120000,
                currency: "VND",
            },
        });

        const out = await svc.confirmByIntent({
            paymentIntentID: "pi_3",
            refresh: true,
        });
        expect(providerClients.momo.verify).toHaveBeenCalledTimes(1);
        expect(out.status).toBe(PAYMENT_STATUS.SUCCEEDED);
        expect(out.confirmed).toBe(true);
        expect(out.refreshed).toBe(true);

        const saved = docRef._dump();
        expect(saved.status).toBe(PAYMENT_STATUS.SUCCEEDED);
        expect(Array.isArray(saved.statusHistory)).toBe(true);
        expect(saved.transactionId).toBe("momo_txn_1");

        expect(paymentProducer.succeeded).toHaveBeenCalledTimes(1);
    });

    it("no regress if document became terminal before update", async () => {
        const { svc, docRef } = mkService({
            docData: {
                paymentIntentID: "pi_4",
                reservationID: "r_4",
                provider: "momo",
                status: PAYMENT_STATUS.PENDING,
            },
            providerResp: { status: "PENDING" },
        });

        // Giả lập trạng thái đổi trước khi tx update
        await docRef.update({ status: PAYMENT_STATUS.SUCCEEDED });

        const out = await svc.confirmByIntent({
            paymentIntentID: "pi_4",
            refresh: true,
        });
        expect(out.status).toBe(PAYMENT_STATUS.SUCCEEDED);
        expect(out.confirmed).toBe(true);
    });
});
