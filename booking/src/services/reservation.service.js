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

// compare-del (unlock an toàn cho user_hold)
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
        redisService,
        eventInventoryClient,
        reservationProducer,
        paymentClient,
        orderService,
        logger = console,
        config = {},
    }) {
        if (!redisService)
            throw new Error("ReservationService: redis required");
        if (!eventInventoryClient)
            throw new Error("ReservationService: eventInv required");

        this.redis = redisService;
        this.eventInv = eventInventoryClient;
        this.reservationProducer = reservationProducer;
        this.paymentClient = paymentClient;
        this.orders = orderService;
        this.logger = logger;
        this.config = config;

        // ENV fallback hợp lý
        this.holdTtlSec = Number.isFinite(config.holdTtlSec)
            ? Number(config.holdTtlSec)
            : Number(process.env.HOLD_TTL_SEC ?? 900);

        this.maxQty = Number.isFinite(config.maxQty)
            ? Number(config.maxQty)
            : Number(process.env.MAX_QTY_PER_LINE ?? 20);

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
        const ip = holdOrIds.client?.ip ?? holdOrIds.clientIp ?? "unknown";
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
        this.logger.debug?.("[reservation.create] input", {
            eventId,
            userId: userId || null,
            clientIp: clientIp || null,
            idemKey,
        });

        // 1) rate-limit nhẹ theo IP (dùng raw client vì libs kỳ vọng incr/expire/ttl)
        if (process.env.RATE_LIMIT_PER_MINUTE !== "0") {
            const rl = await rateLimitOncePerMinute(
                this.redis.r,
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
        }

        // 2) Idempotency cache
        const cached = await getIdemCached(this.redis, idemKey);
        this.logger.debug?.("[reservation.create] idem.cached", {
            has: !!cached,
            status: cached?.status,
        });

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

        // 4) Đặt idempotency pending (libs trả "OK" | "EXISTS")
        const pend = await setIdemPending(this.redis, idemKey);
        this.logger.debug?.("[reservation.create] idem.pending.set", {
            result: pend,
        });

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

        // Enforce 1 hold / user / event (dùng đúng setNXEx boolean)
        const userHoldKey = this.userHoldKeyFrom({ userId, eventId, clientIp });
        this.logger.debug?.("[reservation.create] acquire user_hold", {
            userHoldKey,
            holdTtlSec: this.holdTtlSec,
        });

        let acquired = false;
        try {
            acquired = await this.redis.setNXEx(
                userHoldKey,
                reservationId,
                this.holdTtlSec,
                {
                    jitter: false,
                },
            );
        } catch (e) {
            this.logger.error("[reservation.create] setNXEx error", {
                e: e?.message,
            });
            acquired = false;
        }

        this.logger.debug?.("[reservation.create] user_hold result", {
            acquired,
        });

        if (!acquired) {
            // đọc lại ai giữ + TTL còn lại (tránh multi với prefix)
            const existingId = await this.redis.getRaw(userHoldKey);
            const pttl = await this.redis.pttl(userHoldKey);
            const body = {
                ok: false,
                error: "USER_ALREADY_HAS_HOLD_FOR_EVENT",
                reservationId: existingId || null,
                retryAfterMs: Math.max(0, Number(pttl || 0)),
            };
            await setIdemFinal(this.redis, idemKey, 409, body);
            return { statusCode: 409, body };
        }

        const reserved = [];
        try {
            // Reserve all-or-nothing
            this.logger.debug?.("[reservation.create] reserve.start", {
                reservationId,
                slug,
                lines: normLines,
            });

            for (const l of normLines) {
                const r = await this.eventInv.reserve(l.ttId, {
                    qty: l.qty,
                    eventId,
                    slug,
                    affinityKey: reservationId,
                });

                if (!r?.ok) {
                    this.logger.error("[reservation.create] reserve.failed", {
                        ttId: l.ttId,
                        qty: l.qty,
                        result: r,
                    });
                    throw new Error("INSUFFICIENT_STOCK");
                }

                reserved.push({
                    ttId: l.ttId,
                    qty: l.qty,
                    shardIndex: r.shardIndex,
                    invVersion: r.version ?? 0,
                });
                this.logger.debug?.("[reservation.create] reserve.ok", {
                    ttId: l.ttId,
                    qty: l.qty,
                    shardIndex: r.shardIndex,
                    version: r.version,
                });
            }

            // Persist hold + expiry index (KHÔNG stringify – RedisService tự serialize)
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

            await this.redis.set(holdKey(reservationId), holdPayload, {
                ttl: this.holdTtlSec,
            });
            await this.redis.zadd(holdZset, expiresAt, reservationId);

            // Publish (best-effort)
            try {
                await this.reservationProducer.sendReservationCreated?.(
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
                this.logger.warn("[reservation.publish] failed", e);
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

            this.logger.error("[reservation.create] unexpected", {
                message: err?.message,
                stack: err?.stack,
            });
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
        const hold = await this.redis.get(hKey);
        if (!hold) {
            await this.redis.zrem(holdZset, reservationId).catch(() => {});
            return {
                statusCode: 200,
                body: { ok: true, state: "ALREADY_CLEARED" },
            };
        }

        const slug = hold.slug || `reservation:${reservationId}`;

        try {
            if (this.paymentClient?.confirm) {
                const resp = await this.paymentClient.confirm({
                    reservationID: reservationId,
                    refresh: false,
                });
                if (resp?.success) {
                    const status = resp.data?.status; // PENDING | SUCCEEDED | FAILED | CANCELED | EXPIRED
                    if (status === "SUCCEEDED") {
                        // Idempotent refund theo reservationID
                        await this.paymentClient.refund?.({
                            reservationID: reservationId,
                            reason,
                            metadata: {
                                eventId: hold.eventId,
                                lines: hold.lines,
                                source: "booking.cancelReservation",
                            },
                        });
                    } else if (status === "PENDING") {
                        // tuỳ chính sách: có thể trả 202 và hẹn retry/queue để VOID nếu provider hỗ trợ
                        // return { statusCode: 202, body: { ok: false, error: "PAYMENT_PENDING_CANCEL_QUEUED" } };
                    }
                }
            }
        } catch (e) {
            this.logger.warn("[cancelReservation.refund] failed", e?.message);
        }

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
        const committed = await this.redis.getRaw(committedKey(reservationId));
        if (committed === "1") {
            return {
                statusCode: 200,
                body: { ok: true, state: "ALREADY_COMMITTED" },
            };
        }

        // Lock to avoid race với Kafka consumer
        const lockAcquired = await this.redis.setNXEx(
            confirmLockKey(reservationId),
            "1",
            30,
            {
                jitter: false,
            },
        );
        if (!lockAcquired) {
            return {
                statusCode: 202,
                body: { ok: false, error: "CONFIRM_IN_PROGRESS" },
            };
        }

        try {
            // Load hold
            const hKey = holdKey(reservationId);
            const hold = await this.redis.get(hKey);
            if (!hold) {
                await this.redis.set(committedKey(reservationId), "1", {
                    ttl: 24 * 3600,
                });
                return {
                    statusCode: 200,
                    body: { ok: true, state: "ALREADY_CLEARED" },
                };
            }

            if (Date.now() > Number(hold.expiresAt || 0)) {
                return {
                    statusCode: 409,
                    body: { ok: false, error: "HOLD_EXPIRED" },
                };
            }

            console.log(`PAYMENT...`);
            // Payment check (DB-first)
            if (this.paymentClient?.confirm) {
                console.log(`PAYMENT STARTED...`);
                const resp = await this.paymentClient.confirm({
                    reservationID: reservationId,
                    refresh: false,
                });

                console.log(`PAYMENT RESP: ${JSON.stringify(resp)}`);

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

                if (this.orders?.createFromReservation) {
                    await this.orders.createFromReservation(hold, {
                        amount,
                        currency,
                        paymentIntentId,
                    });
                } else {
                    this.logger.warn(
                        "[confirmReservation] OrderService missing, skip order creation",
                    );
                }
            } else {
                // Không có paymentClient → commit theo policy (demo)
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
                this.redis.set(committedKey(reservationId), "1", {
                    ttl: 24 * 3600,
                }),
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
        const snap = await this.redis.get(snapKey); // object
        if (!snap) return { ok: false, reason: "NO_SNAPSHOT" };

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

        const slug = `late:${reservationId}`;
        const reserved = [];
        try {
            // thử re-reserve all-or-nothing
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
                this.redis.set(committedKey(reservationId), "1", {
                    ttl: 24 * 3600,
                }),
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

            this.logger.error("[lateCommit] unexpected", {
                message: err?.message,
                stack: err?.stack,
            });
            return { ok: false, reason: "ERROR" };
        }
    }
}
