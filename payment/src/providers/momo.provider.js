import { mapMomoStatus } from "../enums/payment-provider.js";
import { PaymentProvider } from "./payment.provider.js";
import crypto from "crypto";

export class MomoProvider extends PaymentProvider {
    constructor({ momoClient, logger = console }) {
        super({ logger });
        this.client = momoClient;
    }

    async createPayment({ orderId, amount, orderInfo, extraData }) {
        const data = await this.client.createOrder({
            orderId,
            amount,
            orderInfo,
            extraData,
        });

        return {
            payUrl: data?.payUrl || data?.deeplink || "",
            orderId,
            raw: data,
        };
    }

    async verify({ orderId, transactionId, amount, currency }) {
        return await this.client.verify({
            orderId,
            transactionId,
            amount,
            currency,
        });
    }

    async verifyIpn(payload) {
        const signatureRaw = Object.keys(payload)
            .filter((k) => k !== "signature")
            .sort()
            .map((k) => `${k}=${payload[k]}`)
            .join("&");

        const expectedSignature = crypto
            .createHmac("sha256", this.client.secretKey)
            .update(signatureRaw)
            .digest("hex");

        const ok = expectedSignature === payload.signature;
        return {
            ok,
            status: mapMomoStatus(payload.resultCode),
            orderId: payload.orderId,
            transactionId: payload.transId
                ? String(payload.transId)
                : undefined,
            amount: payload.amount ? Number(payload.amount) : undefined,
            currency: "VND",
            raw: payload,
        };
    }
}
