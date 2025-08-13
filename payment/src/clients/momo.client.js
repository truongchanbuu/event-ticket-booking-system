import crypto from "crypto";

export class MomoClient {
    constructor({
        partnerCode,
        accessKey,
        secretKey,
        endpoint,
        returnUrl,
        ipnUrl,
        timeoutMs = 5000,
        captureType = "captureWallet",
        http,
    }) {
        this.partnerCode = partnerCode;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.endpoint = endpoint.replace(/\/+$/, "");
        this.returnUrl = returnUrl;
        this.ipnUrl = ipnUrl;
        this.timeoutMs = timeoutMs;
        this.captureType = captureType;
        this.http = http;
    }

    sign(raw) {
        return crypto
            .createHmac("sha256", this.secretKey)
            .update(raw)
            .digest("hex");
    }

    async createOrder({ orderId, amount, orderInfo, extraData }) {
        const requestId = `${this.partnerCode}-${Date.now()}`;
        const body = {
            partnerCode: this.partnerCode,
            accessKey: this.accessKey,
            requestId,
            amount: String(amount),
            orderId,
            orderInfo: orderInfo || `Order ${orderId}`,
            returnUrl: this.returnUrl,
            ipnUrl: this.ipnUrl,
            requestType: this.captureType,
            extraData: extraData
                ? Buffer.from(JSON.stringify(extraData)).toString("base64")
                : "",
            lang: "vi",
        };

        const rawSignature =
            `accessKey=${body.accessKey}&amount=${body.amount}` +
            `&extraData=${body.extraData}&ipnUrl=${body.ipnUrl}` +
            `&orderId=${body.orderId}&orderInfo=${body.orderInfo}` +
            `&partnerCode=${body.partnerCode}&redirectUrl=${body.returnUrl}` +
            `&requestId=${body.requestId}&requestType=${body.requestType}`;

        body.signature = this.sign(rawSignature);

        const url = `${this.endpoint}/v2/gateway/api/create`;
        const { data } = await this.http.post(url, body, {
            timeout: this.timeoutMs,
        });

        return data;
    }

    async verify({ orderId, transactionId, amount, currency }) {
        const requestId = `${this.partnerCode}-${Date.now()}`;
        const body = {
            partnerCode: this.partnerCode,
            accessKey: this.accessKey,
            requestId,
            orderId,
            lang: "vi",
        };

        const rawSignature =
            `accessKey=${body.accessKey}&orderId=${body.orderId}` +
            `&partnerCode=${body.partnerCode}&requestId=${body.requestId}`;

        body.signature = this.sign(rawSignature);

        const url = `${this.endpoint}/v2/gateway/api/query`;
        const { data } = await this.http.post(url, body, {
            timeout: this.timeoutMs,
        });

        return {
            status: mapMomoStatus(data?.resultCode), // -> "SUCCEEDED"/"PENDING"/"FAILED"/"CANCELED"/"EXPIRED"
            orderId,
            transactionId: data?.transId ? String(data.transId) : transactionId,
            amount: amount ?? (data?.amount ? Number(data.amount) : undefined),
            currency: currency ?? "VND",
            raw: data,
        };
    }
}

function mapMomoStatus(resultCode) {
    if (resultCode === 0) return "SUCCEEDED";
    if (resultCode === 1000) return "PENDING";
    if (resultCode === 49 || resultCode === 9043) return "EXPIRED";
    if (resultCode === 53) return "CANCELED";
    return "FAILED";
}
