// src/providers/mock-momo.provider.js
import { PaymentProvider } from "./payment.provider.js";

export class MockMomoProvider extends PaymentProvider {
    constructor({ ipnUrl, store, sendHttp, logger = console }) {
        super({ logger });
        this.ipnUrl = ipnUrl;
        this.store = store;
        this.jitter = { min: 120, max: 600 };
        this.errorRate = 0.01;
        this.sendHttp = sendHttp;
        this.kind = "mock_momo";
    }

    async createPayment({ orderId, amount, orderInfo, extraData }) {
        this.logger.info(`[MockMomo] createPayment ${orderId}`, {
            amount,
            orderInfo,
            extraData,
        });
        return { orderId, payUrl: null, raw: { mock: true } };
    }

    async recordIpnState({ orderId, resultCode, transId, amount }) {
        const status =
            Number(resultCode) === 0
                ? "SUCCEEDED"
                : Number(resultCode) === 53
                  ? "CANCELED"
                  : Number(resultCode) === 49
                    ? "EXPIRED"
                    : Number(resultCode) === 1000
                      ? "PENDING"
                      : "FAILED";
        await this.store.set(orderId, {
            status,
            transId,
            amount,
            ts: Date.now(),
        });
    }

    async verify({ orderId, transactionId, amount, currency }) {
        const ms =
            Math.floor(
                Math.random() * (this.jitter.max - this.jitter.min + 1),
            ) + this.jitter.min;
        await new Promise((r) => setTimeout(r, ms));
        if (Math.random() < this.errorRate) throw new Error("Mock PSP timeout");

        const s = await this.store.get(orderId);
        const status = s?.status || "PENDING";
        return {
            status,
            orderId,
            transactionId: s?.transId || transactionId || `MOCK-${Date.now()}`,
            amount: s?.amount ?? amount,
            currency: currency || "VND",
            raw: { mock: true, jitterMs: ms },
        };
    }

    async verifyIpn(payload) {
        return {
            ok: true,
            status:
                Number(payload.resultCode) === 0
                    ? "SUCCEEDED"
                    : Number(payload.resultCode) === 53
                      ? "CANCELED"
                      : Number(payload.resultCode) === 49
                        ? "EXPIRED"
                        : Number(payload.resultCode) === 1000
                          ? "PENDING"
                          : "FAILED",
            orderId: payload.orderId,
            transactionId: payload.transId
                ? String(payload.transId)
                : undefined,
            amount: payload.amount ? Number(payload.amount) : undefined,
            currency: "VND",
            raw: payload,
        };
    }

    async simulateIpn({ orderId, amount, resultCode = 0, delayMs = 0 }) {
        const payload = {
            orderId,
            amount: String(amount ?? 0),
            resultCode,
            message: resultCode === 0 ? "Success" : "Fail",
            transId: `MOCK-${Date.now()}`,
            signature: "mock", // bỏ qua
        };
        const fire = async () => {
            try {
                await this.sendHttp(this.ipnUrl, payload);
            } catch (e) {
                this.logger.error("[MockMomo] simulate IPN error", e);
            }
        };
        return delayMs > 0 ? setTimeout(fire, delayMs) : fire();
    }
}
