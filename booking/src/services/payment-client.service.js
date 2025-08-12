import { withTimeout } from "@event_ticket_booking_system/shared";

export class PaymentClient {
    constructor({ httpRegistry, logger = console }) {
        if (!httpRegistry?.payments) {
            throw new Error("[PaymentClient] httpRegistry.payments missing");
        }
        this.http = httpRegistry.payments;
        this.logger = logger;
        this.defaultTimeoutMs = 6000;
    }

    _asErrorEnvelope({
        message = "Unknown error",
        statusCode = 500,
        errorCode = "INTERNAL_ERROR",
        errors = null,
    } = {}) {
        return {
            success: false,
            message,
            statusCode,
            errorCode,
            errors,
            data: null,
        };
    }

    async checkout(body, opts = {}) {
        try {
            const reservationID = String(body?.reservationID || "").trim();
            if (!reservationID) {
                return this._asErrorEnvelope({
                    message: "RESERVATION_ID_REQUIRED",
                    statusCode: 400,
                    errorCode: "BAD_REQUEST",
                });
            }

            const headers = { ...(opts.headers || {}) };

            const hasIdem =
                headers["Idempotency-Key"] ||
                headers["idempotency-key"] ||
                headers["IDEMPOTENCY-KEY"];

            if (!hasIdem) {
                headers["Idempotency-Key"] = opts.idemKey || reservationID;
            }

            const httpOpts = {
                headers,
                ...this._withTimeout(opts.signal, opts.timeoutMs),
            };
            const res = await this.http.post(
                "/internal/payment/checkout",
                body,
                httpOpts,
            );

            if (res?.data && typeof res.data.success === "boolean")
                return res.data;
            return this._asErrorEnvelope({
                message: "UPSTREAM_BAD_ENVELOPE",
                statusCode: res?.status || 502,
                errorCode: "BAD_UPSTREAM",
            });
        } catch (err) {
            const statusCode =
                err?.response?.status ||
                (err?.name === "AbortError" ? 504 : 500);
            const data = err?.response?.data;
            if (data && typeof data.success === "boolean") return data;
            return this._asErrorEnvelope({
                message: err?.message || "REQUEST_FAILED",
                statusCode,
                errorCode:
                    err?.code ||
                    (statusCode === 504 ? "GATEWAY_TIMEOUT" : "REQUEST_FAILED"),
            });
        }
    }

    async confirm(body, opts = {}) {
        try {
            const hasIntent = !!String(body?.paymentIntentID || "");
            const hasResv = !!String(body?.reservationID || "");
            if (!hasIntent && !hasResv) {
                return this._asErrorEnvelope({
                    message: "MISSING_RESERVATION_OR_INTENT",
                    statusCode: 400,
                    errorCode: "BAD_REQUEST",
                });
            }

            const httpOpts = withTimeout(opts.signal, opts.timeoutMs);
            const res = await this.http.post(
                "/internal/payment/confirm",
                body,
                httpOpts,
            );

            if (res?.data && typeof res.data.success === "boolean") {
                return res.data;
            }
            return this._asErrorEnvelope({
                message: "UPSTREAM_BAD_ENVELOPE",
                statusCode: res?.status || 502,
                errorCode: "BAD_UPSTREAM",
            });
        } catch (err) {
            const statusCode =
                err?.response?.status ||
                (err?.name === "AbortError" ? 504 : 500);
            const data = err?.response?.data;
            if (data && typeof data.success === "boolean") {
                return data; // giữ nguyên envelope lỗi từ upstream
            }
            return this._asErrorEnvelope({
                message: err?.message || "REQUEST_FAILED",
                statusCode,
                errorCode:
                    err?.code ||
                    (statusCode === 504 ? "GATEWAY_TIMEOUT" : "REQUEST_FAILED"),
            });
        }
    }
}
