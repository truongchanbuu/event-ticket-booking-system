import crypto from "crypto";
import {
    getIdemCached,
    setIdemPending,
    setIdemFinal,
    rateLimitOncePerMinute,
} from "../libs/index.js";

const holdKey = (id) => `hold:${id}`;
const holdZset = "hold_expiries";
const confirmLockKey = (r) => `lock:confirm:${r}`;
const committedKey = (r) => `reservation:committed:${r}`;

const compareDelLua = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
    else
    return 0
    end
`;

function normalizeAndMergeLines(lines, maxQty) {
    if (!Array.isArray(lines) || lines.length === 0) {
        throw new Error("INVALID_LINES");
    }
    const map = new Map();
    for (const l of lines) {
        const ttId = String(l?.ttId ?? "").trim();
        const qty = Number(l?.qty ?? 0);
        if (!ttId || !Number.isInteger(qty) || qty < 1) {
            throw new Error("INVALID_QTY");
        }
        map.set(ttId, (map.get(ttId) || 0) + qty);
    }
    const merged = [...map.entries()].map(([ttId, qty]) => ({ ttId, qty }));
    for (const m of merged) {
        if (m.qty > maxQty) throw new Error("INVALID_QTY");
    }
    return merged;
}

export class ReservationService {
    constructor({
        redisClient,
        eventInventoryClient,
        reservationProducer,
        paymentClient,
        orderService,
        logger = console,
        config = {},
    }) {
        if (!redisClient) throw new Error("ReservationService: redis required");
        if (!eventInventoryClient)
            throw new Error("ReservationService: eventInv required");

        this.redis = redisClient;
        this.eventInv = eventInventoryClient;
        this.reservationProducer = reservationProducer;
        this.paymentClient = paymentClient;
        this.orders = orderService;
        this.logger = logger;

        this.holdTtlSec = Number.isFinite(config.holdTtlSec)
            ? Number(config.holdTtlSec)
            : 900; // 15m
        this.maxQty = Number.isFinite(config.maxQty)
            ? Number(config.maxQty)
            : 20;

        this.compareDelSha = null;
    }

    async ensureCompareDelSha() {
        if (this.compareDelSha) return this.compareDelSha;
        this.compareDelSha = await this.redis.scriptLoad(compareDelLua);
        return this.compareDelSha;
    }

    userHoldKeyFrom(holdOrIds) {
        const userId = holdOrIds.userId ?? null;
        const eventId = holdOrIds.eventId;
        const ip = holdOrIds.client?.ip ?? holdOrIds.clientIp ?? null;
        return userId
            ? `user_hold:${userId}:${eventId}`
            : `user_hold_ip:${ip}:${eventId}`;
    }

    async safeUnlockUserHold(key, reservationId) {
        try {
            const sha = await this.ensureCompareDelSha();
            const r = await this.redis.evalsha(sha, [key], [reservationId]);
            return Number(r) === 1;
        } catch (e) {
            this.logger.warn("[user_hold.unlock] failed", {
                key,
                e: e?.message,
            });
            return false;
        }
    }

    async createReservation({
        eventId,
        lines,
        idemKey,
        clientIp,
        userId,
        userAgent,
    }) {
        // 1) rate-limit nhẹ theo IP
        const rl = await rateLimitOncePerMinute(
            this.redis,
            clientIp || "unknown",
        );
        if (!rl.allowed) {
            return {
                statusCode: 429,
                body: {
                    ok: false,
                    error: "RATE_LIMITED",
                    retryAfterSec: rl.retryAfterSec,
                },
            };
        }

        // 2) Idempotency cache
        const cached = await getIdemCached(this.redis, idemKey);
        if (cached?.status === "done") {
            return { statusCode: cached.statusCode || 201, body: cached.body };
        }
        if (cached?.status === "pending") {
            return {
                statusCode: 409,
                body: {
                    ok: false,
                    error: "IDEMPOTENCY_IN_PROGRESS",
                    retryAfterMs: 1000,
                },
            };
        }

        // 3) Validate inputs
        if (!idemKey) {
            return {
                statusCode: 400,
                body: { ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" },
            };
        }
        if (!eventId) {
            return {
                statusCode: 400,
                body: { ok: false, error: "EVENT_ID_REQUIRED" },
            };
        }

        let normLines;
        try {
            normLines = normalizeAndMergeLines(lines, this.maxQty);
        } catch (e) {
            return {
                statusCode: 400,
                body: { ok: false, error: e.message || "INVALID_LINES" },
            };
        }

        // 4) Đặt idempotency pending
        const pend = await setIdemPending(this.redis, idemKey);
        if (pend !== "OK") {
            return {
                statusCode: 409,
                body: {
                    ok: false,
                    error: "IDEMPOTENCY_IN_PROGRESS",
                    retryAfterMs: 1000,
                },
            };
        }

        // 5) Main flow
        const reservationId = "RSV_" + crypto.randomUUID().replace(/-/g, "");
        const slug = `reservation:${reservationId}`;
        const expiresAt = Date.now() + this.holdTtlSec * 1000;

        // Enforce 1 hold / user / event
        const userHoldKey = userId
            ? `user_hold:${userId}:${eventId}`
            : `user_hold_ip:${clientIp}:${eventId}`;

        const setOk = await this.redis.set(
            userHoldKey,
            reservationId,
            "NX",
            "EX",
            this.holdTtlSec,
        );
        if (setOk !== "OK") {
            const [[, existingId], [, pttl]] = await this.redis
                .multi()
                .get(userHoldKey)
                .pttl(userHoldKey)
                .exec();
            return {
                statusCode: 409,
                body: {
                    ok: false,
                    error: "USER_ALREADY_HAS_HOLD_FOR_EVENT",
                    reservationId: existingId || null,
                    retryAfterMs: Math.max(0, Number(pttl || 0)),
                },
            };
        }

        const reserved = [];
        try {
            // Reserve all-or-nothing
            for (const l of normLines) {
                const r = await this.eventInv.reserve(l.ttId, {
                    qty: l.qty,
                    eventId,
                    hint: reservationId,
                    slug,
                });
                if (!r?.ok) throw new Error("INSUFFICIENT_STOCK");
                reserved.push({
                    ttId: l.ttId,
                    qty: l.qty,
                    shardIndex: r.shardIndex,
                    invVersion: r.version ?? 0,
                });
            }

            // Persist hold + expiry index
            const holdPayload = {
                v: 1,
                reservationId,
                eventId,
                userId: userId || null,
                idemKey,
                lines: reserved,
                expiresAt,
                ttlSec: this.holdTtlSec,
                createdAt: Date.now(),
                client: { ip: clientIp || null, ua: userAgent || null },
                slug,
            };
            await this.redis.setex(
                holdKey(reservationId),
                this.holdTtlSec,
                JSON.stringify(holdPayload),
            );
            await this.redis.zadd(holdZset, expiresAt, reservationId);

            // Publish (non-blocking)
            try {
                await this.reservationProducer?.sendReservationCreated?.(
                    {
                        reservationId,
                        eventId,
                        lines: reserved,
                        expiresAt,
                        userId: userId || null,
                    },
                    { source: "booking-service" },
                    {
                        "event-version": "1",
                        "Idempotency-Key": String(idemKey || ""),
                    },
                );
            } catch (e) {
                this.logger.warn("[reservation.publish] failed", e?.message);
            }

            // Finalize idempotency
            const body = {
                ok: true,
                reservationId,
                expiresAt,
                ttlMs: this.holdTtlSec * 1000,
                serverTime: Date.now(),
                lines: reserved,
            };
            await setIdemFinal(this.redis, idemKey, 201, body);
            return { statusCode: 201, body };
        } catch (err) {
            // Rollback user_hold
            const sha = await this.ensureCompareDelSha();
            await this.redis.evalsha(sha, [userHoldKey], [reservationId]);

            // Release partial reservations if any
            if (reserved.length) {
                await Promise.allSettled(
                    reserved.map((rl) =>
                        this.eventInv.release(rl.ttId, {
                            qty: rl.qty,
                            shardIndex: rl.shardIndex,
                            eventId,
                            slug,
                        }),
                    ),
                );
            }

            if (err?.message === "INSUFFICIENT_STOCK") {
                const body = { ok: false, error: "INSUFFICIENT_STOCK" };
                await setIdemFinal(this.redis, idemKey, 409, body);
                return { statusCode: 409, body };
            }

            this.logger.error("[reservation.create] unexpected", err);
            const body = { ok: false, error: "INTERNAL" };
            await setIdemFinal(this.redis, idemKey, 500, body);
            return { statusCode: 500, body };
        }
    }

    /**
     * Cancel reservation: release inventory, unlock user_hold, cleanup keys.
     */
    async cancelReservation({ reservationId }) {
        if (!reservationId) {
            return {
                statusCode: 400,
                body: { ok: false, error: "RESERVATION_ID_REQUIRED" },
            };
        }

        const hKey = holdKey(reservationId);
        const raw = await this.redis.get(hKey);
        if (!raw) {
            await this.redis.zrem(holdZset, reservationId).catch(() => {});
            return {
                statusCode: 200,
                body: { ok: true, state: "ALREADY_CLEARED" },
            };
        }

        const hold = JSON.parse(raw);
        const slug = hold.slug || `reservation:${reservationId}`;

        // Release inventory (best-effort)
        await Promise.allSettled(
            (hold.lines || []).map((l) =>
                this.eventInv.release(l.ttId, {
                    qty: l.qty,
                    shardIndex: l.shardIndex,
                    eventId: hold.eventId,
                    slug,
                }),
            ),
        );

        // Unlock user_hold safely
        const userHoldKey = this.userHoldKeyFrom(hold);
        await this.safeUnlockUserHold(userHoldKey, reservationId);

        // Cleanup
        await Promise.allSettled([
            this.redis.del(hKey),
            this.redis.zrem(holdZset, reservationId),
        ]);

        // Publish cancelled (best-effort)
        try {
            await this.reservationProducer?.sendReservationCancelled?.(
                { reservationId, eventId: hold.eventId },
                { source: "booking-service" },
            );
        } catch (e) {
            this.logger.warn("[reservation.publish.cancel] failed", e?.message);
        }

        return { statusCode: 200, body: { ok: true } };
    }

    /**
     * Confirm: check payment, commit Order+Tickets idempotent, cleanup hold.
     */
    async confirmReservation({ reservationId, userId }) {
        if (!reservationId) {
            return {
                statusCode: 400,
                body: { ok: false, error: "RESERVATION_ID_REQUIRED" },
            };
        }

        // Idempotency (already committed?)
        const already = await this.redis.get(committedKey(reservationId));
        if (already === "1") {
            return {
                statusCode: 200,
                body: { ok: true, state: "ALREADY_COMMITTED" },
            };
        }

        // Lock to avoid race with Kafka consumer
        const got = await this.redis.set(
            confirmLockKey(reservationId),
            "1",
            "NX",
            "EX",
            30,
        );
        if (got !== "OK") {
            return {
                statusCode: 202,
                body: { ok: false, error: "CONFIRM_IN_PROGRESS" },
            };
        }

        try {
            // Load hold
            const hKey = holdKey(reservationId);
            const raw = await this.redis.get(hKey);
            if (!raw) {
                await this.redis.set(
                    committedKey(reservationId),
                    "1",
                    "EX",
                    24 * 3600,
                );
                return {
                    statusCode: 200,
                    body: { ok: true, state: "ALREADY_CLEARED" },
                };
            }

            const hold = JSON.parse(raw);
            if (Date.now() > Number(hold.expiresAt || 0)) {
                return {
                    statusCode: 409,
                    body: { ok: false, error: "HOLD_EXPIRED" },
                };
            }

            // Payment check (DB-first)
            if (this.paymentClient?.confirm) {
                const resp = await this.paymentClient.confirm({
                    reservationID: reservationId,
                    refresh: false, // FE có thể gọi lại nhiều lần; refresh-on-demand khi cần
                });

                if (!resp.success) {
                    return {
                        statusCode: resp.statusCode || 502,
                        body: {
                            ok: false,
                            error: resp.message || "PAYMENT_SERVICE_ERROR",
                        },
                    };
                }

                const status = resp.data?.status; // "PENDING"|"SUCCEEDED"|"FAILED"|"CANCELED"|"EXPIRED"
                if (status !== "SUCCEEDED") {
                    const sc = status === "PENDING" ? 202 : 402;
                    return {
                        statusCode: sc,
                        body: { ok: false, error: "PAYMENT_REQUIRED", status },
                    };
                }

                // Build order/tickets
                const paymentIntentId = resp.data?.paymentIntentID || null;
                const currency = resp.data?.currency || "VND";
                const amount = Number.isFinite(resp.data?.amount)
                    ? resp.data.amount
                    : null;

                if (!this.orders?.createFromReservation) {
                    this.logger.warn(
                        "[confirmReservation] OrderService missing, skip order creation",
                    );
                } else {
                    await this.orders.createFromReservation(hold, {
                        amount,
                        currency,
                        paymentIntentId,
                    });
                }
            } else {
                // Không có paymentClient → tuỳ policy: ở đây vẫn commit (log cảnh báo)
                this.logger.warn(
                    "[confirmReservation] paymentClient missing; skipping paid check",
                );
                if (this.orders?.createFromReservation) {
                    await this.orders.createFromReservation(hold, {
                        currency: "VND",
                    });
                }
            }

            // Cleanup + committed flag
            const userHoldKey = this.userHoldKeyFrom(hold);
            await this.safeUnlockUserHold(userHoldKey, reservationId);

            await Promise.allSettled([
                this.redis.del(hKey),
                this.redis.zrem(holdZset, reservationId),
                this.redis.set(
                    committedKey(reservationId),
                    "1",
                    "EX",
                    24 * 3600,
                ),
            ]);

            // Publish committed (best-effort)
            try {
                await this.reservationProducer?.sendReservationCommitted?.(
                    { reservationId, eventId: hold.eventId, lines: hold.lines },
                    { source: "booking-service" },
                );
            } catch (e) {
                this.logger.warn(
                    "[reservation.publish.commit] failed",
                    e?.message,
                );
            }

            return { statusCode: 200, body: { ok: true } };
        } finally {
            await this.redis.del(confirmLockKey(reservationId));
        }
    }

    async attemptLateCommitFromSnapshot({ reservationId, paymentInfo }) {
        if (!reservationId)
            return { ok: false, reason: "RESERVATION_ID_REQUIRED" };

        const snapKey = `reservation:expired:${reservationId}`;
        const raw = await this.redis.get(snapKey);
        if (!raw) return { ok: false, reason: "NO_SNAPSHOT" };

        const snap = JSON.parse(raw);
        const now = Date.now();
        const graceMs = Number(this.config?.reservation?.graceMs ?? 0);

        if (!graceMs || now > Number(snap.expiredAt) + graceMs) {
            // quá grace → refund
            try {
                await this.paymentClient?.refund?.({
                    reservationID: reservationId,
                    reason: "GRACE_WINDOW_EXPIRED",
                    metadata: { paymentInfo },
                });
            } catch (e) {
                this.logger.warn("[lateCommit.refund] failed", e?.message);
            }
            return { ok: false, reason: "GRACE_EXPIRED_REFUNDED" };
        }

        // thử re-reserve all-or-nothing
        const slug = `late:${reservationId}`;
        const reserved = [];
        try {
            for (const l of snap.lines || []) {
                const r = await this.eventInv.reserve(l.ttId, {
                    qty: l.qty,
                    eventId: snap.eventId,
                    hint: reservationId,
                    slug,
                });
                if (!r?.ok) throw new Error("INSUFFICIENT_STOCK");
                reserved.push({
                    ttId: l.ttId,
                    qty: l.qty,
                    shardIndex: r.shardIndex,
                });
            }

            // Ghi order & tickets (idempotent)
            if (this.orders?.createFromReservation) {
                await this.orders.createFromReservation(
                    {
                        reservationId,
                        eventId: snap.eventId,
                        userId: snap.userId || null,
                        lines: snap.lines,
                        createdAt: snap.createdAt,
                        expiresAt: snap.expiredAt,
                    },
                    {
                        amount: Number.isFinite(paymentInfo?.amount)
                            ? paymentInfo.amount
                            : null,
                        currency: paymentInfo?.currency || "VND",
                        paymentIntentId: paymentInfo?.paymentIntentID || null,
                    },
                );
            }

            // cleanup snapshot + schedule + mark committed
            await Promise.allSettled([
                this.redis.del(snapKey),
                this.redis.zrem("auto_cancel:due", reservationId),
                this.redis.set(
                    committedKey(reservationId),
                    "1",
                    "EX",
                    24 * 3600,
                ),
            ]);

            // publish commit
            try {
                await this.reservationProducer?.sendReservationCommitted?.(
                    { reservationId, eventId: snap.eventId, lines: snap.lines },
                    { source: "booking-service", cause: "late-payment" },
                );
            } catch (e) {
                this.logger.warn("[lateCommit.publish] failed", e?.message);
            }

            return { ok: true };
        } catch (err) {
            // rollback phần đã reserve
            await Promise.allSettled(
                reserved.map((rl) =>
                    this.eventInv.release(rl.ttId, {
                        qty: rl.qty,
                        shardIndex: rl.shardIndex,
                        eventId: snap.eventId,
                        slug,
                    }),
                ),
            );

            if (err?.message === "INSUFFICIENT_STOCK") {
                try {
                    await this.paymentClient?.refund?.({
                        reservationID: reservationId,
                        reason: "OUT_OF_STOCK_AFTER_GRACE",
                        metadata: { paymentInfo },
                    });
                } catch (e) {
                    this.logger.warn(
                        "[lateCommit.refund.oos] failed",
                        e?.message,
                    );
                }
                return { ok: false, reason: "OOS_REFUNDED" };
            }

            this.logger.error("[lateCommit] unexpected", err);
            return { ok: false, reason: "ERROR" };
        }
    }
}
