import nock from "nock";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { MomoClient } from "../src/clients/momo.client.js";

const endpoint = "https://test-payment.momo.vn";

describe("MomoClient.verify", () => {
    let momo;
    beforeEach(() => {
        momo = new MomoClient({
            partnerCode: "pc",
            accessKey: "ak",
            secretKey: "sk",
            endpoint,
            returnUrl: "https://fe/success",
            ipnUrl: "https://be/ipn",
            http: {
                post: async (url, body) => {
                    const res = await fetch(url, {
                        method: "POST",
                        body: JSON.stringify(body),
                    });
                    const data = await res.json();
                    return { status: res.status, data };
                },
            },
        });
        nock.cleanAll();
    });
    afterEach(() => nock.cleanAll());

    it("maps resultCode=0 to SUCCEEDED", async () => {
        nock(endpoint).post("/v2/gateway/api/query").reply(200, {
            resultCode: 0,
            transId: 123,
            amount: 120000,
        });

        const out = await momo.verify({
            orderId: "ORD_1",
            amount: 120000,
            currency: "VND",
        });
        expect(out.status).toBe("SUCCEEDED");
        expect(out.transactionId).toBe("123");
        expect(out.amount).toBe(120000);
    });

    it("maps resultCode=1000 to PENDING", async () => {
        nock(endpoint)
            .post("/v2/gateway/api/query")
            .reply(200, { resultCode: 1000 });
        const out = await momo.verify({ orderId: "ORD_2" });
        expect(out.status).toBe("PENDING");
    });
});
