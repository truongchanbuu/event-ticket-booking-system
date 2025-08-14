import { withTimeout } from "@event_ticket_booking_system/shared"; // dùng bản callback(fn, ms)

export class PaymentClient {
    constructor({ httpRegistry, logger = console }) {
        if (!httpRegistry?.payments) {
            throw new Error("[PaymentClient] httpRegistry.payments missing");
        }
        this.http = httpRegistry.payments; // axios instance
        this.logger = logger;
        this.defaultTimeoutMs = 6000;
    }

    _asErrorEnvelope({
        message = "Unknown error",
        statusCode = 500,
        errorCode = "INTERNAL_ERROR",
        errors = null,
        data = null,
    } = {}) {
        return { success: false, message, statusCode, errorCode, errors, data };
    }

    _normalizeFromAxios(res) {
        if (res?.data && typeof res.data.success === "boolean") return res.data;
        return this._asErrorEnvelope({
            message: "UPSTREAM_BAD_ENVELOPE",
            statusCode: res?.status || 502,
            errorCode: "BAD_UPSTREAM",
        });
    }

    _pickStatusCodeFromError(err) {
        return (
            err?.response?.status || (err?.name === "AbortError" ? 504 : 500)
        );
    }

    _pickErrorCodeFromError(err, statusCode) {
        if (err?.code) return err.code; // ECONNRESET, ETIMEDOUT, ...
        if (statusCode === 504) return "GATEWAY_TIMEOUT";
        return "REQUEST_FAILED";
    }

    _hasHeaderIdem(headers) {
        if (!headers) return false;
        const keys = Object.keys(headers);
        return keys.some((k) => k.toLowerCase() === "idempotency-key");
    }

    _setHeaderIdemIfMissing(headers, key) {
        if (!this._hasHeaderIdem(headers)) headers["Idempotency-Key"] = key;
    }

    _mergeHeaders(a = {}, b = {}) {
        const out = { ...a, ...b };
        const entries = Object.entries(out);
        let idem;
        for (const [k, v] of entries) {
            if (k.toLowerCase() === "idempotency-key") {
                idem = v;
                break;
            }
        }
        if (idem !== undefined) out["Idempotency-Key"] = String(idem);
        return out;
    }

    _deriveConfirmIdemKey(body = {}) {
        const intent = String(
            body?.paymentIntentID || body?.paymentIntentId || "",
        );
        const rsv = String(body?.reservationID || body?.reservationId || "");
        return intent || rsv ? `${intent || rsv}:confirm` : "confirm";
    }

    async _post(path, { body, timeoutMs, signal, headers }) {
        const ttl =
            Number.isFinite(timeoutMs) && timeoutMs > 0
                ? timeoutMs
                : this.defaultTimeoutMs;

        return withTimeout(async (timeoutSignal) => {
            let finalSignal = timeoutSignal;
            try {
                if (
                    signal &&
                    typeof AbortSignal !== "undefined" &&
                    AbortSignal.any
                ) {
                    finalSignal = AbortSignal.any([timeoutSignal, signal]);
                }
            } catch {}

            const res = await this.http.post(path, body, {
                headers,
                signal: finalSignal,
            });

            return this._normalizeFromAxios(res);
        }, ttl);
    }

    // ========== APIs ==========
    async checkout(body, opts = {}) {
        try {
            const reservationID = String(
                body?.reservationID || body?.reservationId || "",
            ).trim();
            if (!reservationID) {
                return this._asErrorEnvelope({
                    message: "RESERVATION_ID_REQUIRED",
                    statusCode: 400,
                    errorCode: "BAD_REQUEST",
                });
            }

            const headers = this._mergeHeaders(
                opts.defaultHeaders,
                opts.headers,
            );
            this._setHeaderIdemIfMissing(
                headers,
                opts.idemKey || reservationID,
            );

            return await this._post("/api/internal/payment/checkout", {
                body,
                timeoutMs: opts.timeoutMs,
                signal: opts.signal,
                headers,
            });
        } catch (err) {
            const statusCode = this._pickStatusCodeFromError(err);
            const data = err?.response?.data;
            if (data && typeof data.success === "boolean") return data;
            return this._asErrorEnvelope({
                message: err?.message || "REQUEST_FAILED",
                statusCode,
                errorCode: this._pickErrorCodeFromError(err, statusCode),
            });
        }
    }

    async confirm(body, opts = {}) {
        try {
            const hasIntent = !!String(
                body?.paymentIntentID || body?.paymentIntentId || "",
            );
            const hasResv = !!String(
                body?.reservationID || body?.reservationId || "",
            );
            if (!hasIntent && !hasResv) {
                return this._asErrorEnvelope({
                    message: "MISSING_RESERVATION_OR_INTENT",
                    statusCode: 400,
                    errorCode: "BAD_REQUEST",
                });
            }

            const headers = this._mergeHeaders(
                opts.defaultHeaders,
                opts.headers,
            );
            this._setHeaderIdemIfMissing(
                headers,
                opts.idemKey || this._deriveConfirmIdemKey(body),
            );

            return await this._post("/api/internal/payment/confirm", {
                body,
                timeoutMs: opts.timeoutMs,
                signal: opts.signal,
                headers,
            });
        } catch (err) {
            const statusCode = this._pickStatusCodeFromError(err);
            const data = err?.response?.data;
            if (data && typeof data.success === "boolean") return data; // giữ nguyên envelope lỗi upstream
            return this._asErrorEnvelope({
                message: err?.message || "REQUEST_FAILED",
                statusCode,
                errorCode: this._pickErrorCodeFromError(err, statusCode),
            });
        }
    }

    async refund(
        { reservationID, reason, metadata, idempotencyKey } = {},
        opts = {},
    ) {
        if (!reservationID || typeof reservationID !== "string") {
            return this._asErrorEnvelope({
                message: "RESERVATION_ID_REQUIRED",
                statusCode: 400,
                errorCode: "BAD_REQUEST",
            });
        }

        try {
            const headers = this._mergeHeaders(
                opts?.defaultHeaders,
                opts?.headers,
            );
            this._setHeaderIdemIfMissing(
                headers,
                idempotencyKey || `${reservationID}:refund`,
            );

            const body = { reservationID, reason, metadata };

            return await this._post("/api/internal/payment/refund", {
                body,
                timeoutMs: opts?.timeoutMs,
                signal: opts?.signal,
                headers,
            });
        } catch (err) {
            const statusCode = this._pickStatusCodeFromError(err);
            this.logger.warn("[PaymentClient.refund] error", err?.message);
            const data = err?.response?.data;
            if (data && typeof data.success === "boolean") return data;
            return this._asErrorEnvelope({
                message: "PAYMENT_REFUND_FAILED",
                statusCode,
                errorCode: this._pickErrorCodeFromError(err, statusCode),
            });
        }
    }
}
