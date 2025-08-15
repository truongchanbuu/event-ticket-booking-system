// services/event-inventory.client.ts
import crypto from "node:crypto";

export class EventInventoryClient {
    constructor({ httpRegistry, logger = console, defaultHeaders = {} }) {
        if (!httpRegistry?.events) {
            throw new Error(
                "[EventInventoryClient] httpRegistry.events missing",
            );
        }
        this.http = httpRegistry.events;
        this.logger = logger;
        this.defaultHeaders = defaultHeaders;
        this.defaultTimeoutMs = 2000;
    }

    _reservePath(ttId) {
        return `/api/internal/inventory/${encodeURIComponent(ttId)}/reserve`;
    }
    _releasePath(ttId) {
        return `/api/internal/inventory/${encodeURIComponent(ttId)}/release`;
    }
    _reserveBatchPath() {
        return `/api/internal/inventory/batch/reserve`;
    }
    _releaseBatchPath() {
        return `/api/internal/inventory/batch/release`;
    }

    _mkIdem(reservationId, ttId) {
        return crypto
            .createHash("sha256")
            .update(`inv:${reservationId}:${ttId}`)
            .digest("hex");
    }

    _mergeHeaders(extra) {
        return { ...this.defaultHeaders, ...(extra || {}) };
    }

    _timeout(ms) {
        return Math.max(500, Math.min(ms ?? this.defaultTimeoutMs, 8000));
    }

    _ok(res) {
        return res?.status >= 200 && res?.status < 300;
    }

    _normalizeError(e, ctx = {}) {
        const status = e?.response?.status ?? 0;
        const data = e?.response?.data;
        const message = e?.message || data?.message || "INVENTORY_HTTP_ERROR";
        return { ok: false, error: data?.error || message, status, ctx };
    }

    /**
     * Reserve inventory for a ticket type
     * body: { qty, eventId, slug, affinityKey, hint? }
     */
    async reserve(ttId, body, opts = {}) {
        try {
            if (!ttId || !String(ttId).trim()) {
                return { ok: false, error: "INVALID_TICKET_TYPE", status: 400 };
            }
            const res = await this.http.post(this._reservePath(ttId), body, {
                signal: opts.signal,
                timeout: this._timeout(opts.timeoutMs),
                headers: this._mergeHeaders(opts.headers),
            });
            if (!this._ok(res)) {
                this.logger.warn("[EventInventoryClient] reserve non-2xx", {
                    ttId,
                    status: res.status,
                    data: res.data,
                });
            }
            // kỳ vọng server trả { ok, shardIndex, version, newRemaining, ... }
            return (
                res.data ?? {
                    ok: false,
                    error: "RESERVE_FAILED",
                    status: res.status,
                }
            );
        } catch (e) {
            this.logger.warn?.("[EventInventoryClient] reserve error", {
                ttId,
                msg: e?.message,
            });
            return this._normalizeError(e, { ttId });
        }
    }

    /**
     * Release inventory
     * body: { qty, shardIndex, eventId, slug }
     */
    async release(ttId, body, opts = {}) {
        try {
            if (!ttId || !String(ttId).trim()) {
                return { ok: false, error: "INVALID_TICKET_TYPE", status: 400 };
            }
            const res = await this.http.post(this._releasePath(ttId), body, {
                signal: opts.signal,
                timeout: this._timeout(opts.timeoutMs),
                headers: this._mergeHeaders(opts.headers),
            });
            if (!this._ok(res)) {
                this.logger.warn("[EventInventoryClient] release non-2xx", {
                    ttId,
                    status: res.status,
                    data: res.data,
                });
            }
            return (
                res.data ?? {
                    ok: false,
                    error: "RELEASE_FAILED",
                    status: res.status,
                }
            );
        } catch (e) {
            this.logger.warn?.("[EventInventoryClient] release error", {
                ttId,
                msg: e?.message,
            });
            return this._normalizeError(e, { ttId });
        }
    }

    /**
     * Optional: batch reserve to reduce RTT (server cần hỗ trợ)
     * lines: [{ ttId, qty, hint?, affinityKey? }]
     * returns: { ok, results: [{ ttId, ok, shardIndex, version, error? }] }
     */
    async reserveMany({ eventId, slug, lines }, opts = {}) {
        try {
            const res = await this.http.post(
                this._reserveBatchPath(),
                { eventId, slug, lines },
                {
                    timeout: this._timeout(opts.timeoutMs),
                    headers: this._mergeHeaders(opts.headers),
                },
            );
            return (
                res.data ?? {
                    ok: false,
                    error: "RESERVE_BATCH_FAILED",
                    status: res.status,
                }
            );
        } catch (e) {
            return this._normalizeError(e, { batch: true });
        }
    }

    async releaseMany({ eventId, slug, lines }, opts = {}) {
        try {
            const res = await this.http.post(
                this._releaseBatchPath(),
                { eventId, slug, lines },
                {
                    timeout: this._timeout(opts.timeoutMs),
                    headers: this._mergeHeaders(opts.headers),
                },
            );
            return (
                res.data ?? {
                    ok: false,
                    error: "RELEASE_BATCH_FAILED",
                    status: res.status,
                }
            );
        } catch (e) {
            return this._normalizeError(e, { batch: true });
        }
    }

    /**
     * Gợi ý header pack cho mỗi lần reserve/release: truyền thẳng vào opts.headers
     */
    buildReserveHeaders({
        reservationId,
        eventId,
        idemKey,
        clientIp,
        userId,
        userAgent,
    }) {
        return this._mergeHeaders({
            "X-Source": "booking-service",
            "X-Event-Id": eventId,
            "X-Reservation-Id": reservationId,
            "X-Client-Ip": clientIp ?? "",
            "X-User-Id": userId ?? "",
            "User-Agent": userAgent ?? "booking-service",
            // Idempotency per-line để safe khi retry network:
            // nếu server inventory hỗ trợ, hãy đọc header này để đảm bảo idempotent
            "Idempotency-Key": this._mkIdem(reservationId, "LINE"), // sẽ gán cụ thể tại call site
        });
    }
}
