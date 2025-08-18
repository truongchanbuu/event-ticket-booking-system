import { randomUUID } from "node:crypto";

import { getIdemCached, setIdemPending, setIdemFinal } from "../libs/index.js";
import {
    normalizeStatus,
    TERMINAL,
} from "@event_ticket_booking_system/shared/enums/payment-status.enum.js";

const holdKey = (id) => `hold:${id}`;
const holdZset = "hold_expiries";
const confirmLockKey = (r) => `lock:confirm:${r}`;
const committedKey = (r) => `reservation:committed:${r}`;
const buyerClaimKey = (rid) => `reservation:buyer_claim:${rid}`;

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

const SLUG_MEM_TTL_MS = 60_000;
const LUA_PERSIST_HOLD = `
  -- KEYS[1] = holdKey, KEYS[2] = zsetKey
  -- ARGV[1] = ttlSec, ARGV[2] = payload(JSON), ARGV[3] = expiresAt(ms), ARGV[4] = rid
  local ttl = tonumber(ARGV[1])
  redis.call('SETEX', KEYS[1], ttl, ARGV[2])
  redis.call('ZADD', KEYS[2], ARGV[3], ARGV[4])
  return 1
`;

export class ReservationService {
    constructor({
        httpRegistry,
        redisService,
        eventInventoryClient,
        reservationProducer,
        redisPubSub,
        paymentClient,
        orderService,
        logger = console,
        config = {},
    }) {
        if (!redisService)
            throw new Error("ReservationService: redis required");
        if (!eventInventoryClient)
            throw new Error("ReservationService: eventInv required");

        this.httpEvents = httpRegistry?.events || null;
        this.redis = redisService;

        this.redisPubSub = redisPubSub;
        this.eventInv = eventInventoryClient;
        this.reservationProducer = reservationProducer;
        this.paymentClient = paymentClient;
        this.orders = orderService;
        this._slugMem = new Map();
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

        console.log(`HOLD IN SEC: ${this.holdTtlSec}`);
    }

    availabilitySlugFrom(eventId) {
        return `event:${eventId}`;
    }

    availabilityChannel(slug) {
        return `availability:slug:${slug}`;
    }

    _getMemSlug(eventId) {
        const rec = this._slugMem.get(eventId);
        if (rec && rec.exp > Date.now()) return rec.slug || null;
        if (rec) this._slugMem.delete(eventId);
        return null;
    }
    _setMemSlug(eventId, slug) {
        if (!slug) return;
        this._slugMem.set(eventId, { slug, exp: Date.now() + SLUG_MEM_TTL_MS });
    }

    _maxInvVersionFromLines(lines = []) {
        let max = null;
        for (const l of lines) {
            const v = Number(l?.invVersion ?? l?.version);
            if (Number.isFinite(v)) max = max == null ? v : Math.max(max, v);
        }
        return max;
    }

    async resolveEventSlug(eventId, hinted) {
        if (!eventId) return null;
        if (hinted && typeof hinted === "string") {
            this._setMemSlug(eventId, hinted);
            return hinted;
        }

        // 1) Memory cache
        const mem = this._getMemSlug(eventId);
        if (mem) return mem;

        // 2) Redis mapping
        try {
            const s = await this.redis?.hget?.("event:slug", eventId);
            if (s) {
                this._setMemSlug(eventId, s);
                return s;
            }
        } catch (e) {
            this.logger.debug?.("[resolveEventSlug] HGET failed", {
                eventId,
                err: e?.message,
            });
        }

        // 3) HTTP fallback (nếu có)
        if (this.httpEvents?.get) {
            try {
                // giả sử event-service có endpoint nội bộ trả { slug }
                const resp = await this.httpEvents.get(
                    `/api/internal/events/${encodeURIComponent(eventId)}`,
                );
                const slug = resp?.data?.slug || null;
                if (slug) {
                    this._setMemSlug(eventId, slug);
                    try {
                        await this.redis?.hset?.("event:slug", eventId, slug);
                    } catch {}
                    return slug;
                }
            } catch (e) {
                this.logger.debug?.("[resolveEventSlug] HTTP fallback failed", {
                    eventId,
                    err: e?.message,
                });
            }
        }

        return null;
    }

    async _publishAvailabilityWithVersionBySlug(
        slug,
        { invVersion, reason } = {},
    ) {
        if (!slug) return;
        const hasNativePublish = typeof this.redis?.publish === "function";
        const pub = this.redisPubSub?.publish
            ? this.redisPubSub
            : hasNativePublish
              ? this.redis
              : null;

        if (!pub) {
            this.logger.warn("[availability] no publisher available");
            return;
        }

        // Invalidate cache trước khi nudge (đừng quên sửa this.redis 👇)
        try {
            await this.redis.del(`availability:cache:${slug}`);
            await this.redis.del(`availability:etag:${slug}`);
        } catch {}

        const msg = JSON.stringify({
            slug,
            invVersion: Number.isFinite(invVersion) ? invVersion : undefined,
            reason: reason || "nudge",
            ts: Date.now(),
        });

        await pub.publish(`availability:slug:${slug}`, msg);
    }

    async _publishAvailabilityWithVersionByEventId(
        eventId,
        { invVersion, reason } = {},
    ) {
        const slug =
            (await this.resolveEventSlug(eventId)) ??
            this.availabilitySlugFrom(eventId);
        await this._publishAvailabilityWithVersionBySlug(slug, {
            invVersion,
            reason,
        });
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

    async getReservationByID({
        reservationId,
        includePayment = false,
        refreshPayment = false,
    }) {
        reservationId = String(reservationId || "").replace(/^"+|"+$/g, "");
        const started = Date.now();
        try {
            if (!reservationId) {
                return {
                    statusCode: 400,
                    body: { ok: false, error: "RESERVATION_ID_REQUIRED" },
                };
            }

            // 0) Đã commit?
            try {
                const committed = await this.redis.getRaw(
                    committedKey(reservationId),
                );

                if (committed === "1") {
                    return {
                        statusCode: 200,
                        body: {
                            ok: true,
                            reservationId,
                            state: "ALREADY_COMMITTED",
                            serverTime: Date.now(),
                        },
                    };
                }
            } catch {}

            const hKey = holdKey(reservationId);
            // 1) Hold còn sống?
            const raw = await this.redis.get(hKey);
            if (raw) {
                const hold = typeof raw === "string" ? JSON.parse(raw) : raw;
                let ttlMs = 0;
                try {
                    const pttl = await this.redis.pttl(hKey);
                    ttlMs =
                        pttl > 0
                            ? pttl
                            : Math.max(
                                  0,
                                  Number(hold.expiresAt || 0) - Date.now(),
                              );
                } catch {
                    ttlMs = Math.max(
                        0,
                        Number(hold.expiresAt || 0) - Date.now(),
                    );
                }

                const body = {
                    ok: true,
                    reservationId,
                    eventId: hold.eventId,
                    lines: hold.lines || [],
                    expiresAt: Number(hold.expiresAt || 0),
                    ttlMs,
                    serverTime: Date.now(),
                };

                // 1.1) (tuỳ chọn) Kèm payment intent còn sống
                if (includePayment && this.paymentClient) {
                    try {
                        let intent =
                            (await this.paymentClient.getByReservationId?.(
                                reservationId,
                            )) || null;

                        if (
                            refreshPayment &&
                            intent &&
                            !TERMINAL.includes(
                                normalizeStatus(intent.status),
                            ) &&
                            typeof this.paymentClient.confirm === "function"
                        ) {
                            const c = await this.paymentClient.confirm({
                                reservationID: reservationId,
                                refresh: true,
                            });
                            if (c?.success)
                                intent = {
                                    ...(intent || {}),
                                    ...(c.data || {}),
                                };
                        }

                        if (intent) {
                            body.payment = {
                                paymentIntentID: intent.paymentIntentID || null,
                                transactionId: intent.transactionId || null,
                                qrUrl: intent.qrUrl || null,
                                expiresAt: intent.expiresAt || null,
                                status: intent.status,
                                provider: intent.provider || null,
                            };
                        }
                    } catch (e) {
                        this.logger.debug?.(
                            "[getReservationByID] payment attach failed",
                            { reservationId, err: e?.message },
                        );
                    }
                }

                return { statusCode: 200, body };
            }

            // 2) Hết hold: thử snapshot (grace window)
            const snapKey = `reservation:expired:${reservationId}`;
            const snap = await this.redis.get(snapKey);
            if (snap) {
                let graceRemainingMs = 0;
                try {
                    const due = await this.redis.zscore(
                        "auto_cancel:due",
                        reservationId,
                    );
                    graceRemainingMs =
                        due != null ? Math.max(0, Number(due) - Date.now()) : 0;
                } catch {}
                return {
                    statusCode: 200,
                    body: {
                        ok: true,
                        reservationId,
                        state: "HOLD_EXPIRED",
                        graceRemainingMs,
                        serverTime: Date.now(),
                    },
                };
            }

            // 3) Không thấy
            return {
                statusCode: 404,
                body: { ok: false, error: "RESERVATION_NOT_FOUND" },
            };
        } catch (e) {
            this.logger.error("[getReservationByID] unexpected", {
                reservationId,
                err: e?.message,
            });
            return { statusCode: 500, body: { ok: false, error: "INTERNAL" } };
        } finally {
            this.logger.info("[reservation.get] done", {
                reservationId,
                durMs: Date.now() - started,
            });
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

        if (!idemKey) {
            return {
                statusCode: 400,
                body: { ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" },
            };
        }

        // 1) Idempotency cache
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

        // 2) Validate
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

        // 3) Mark idempotency pending
        const pend = await setIdemPending(this.redis, idemKey);
        this.logger.debug?.("[reservation.create] idem.pending.set", {
            result: pend,
        });
        if (pend !== "OK" || pend === true) {
            return {
                statusCode: 409,
                body: {
                    ok: false,
                    error: "IDEMPOTENCY_IN_PROGRESS",
                    retryAfterMs: 1000,
                },
            };
        }

        // 4) Main
        const reservationId = "RSV_" + randomUUID().replace(/-/g, "");
        const slug = `reservation:${reservationId}`;
        const expiresAt = Date.now() + this.holdTtlSec * 1000;

        // 4.1) Acquire user_hold (1 user / 1 event)
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
                { jitter: false },
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
            const existingId = await this.redis.get(userHoldKey); // deserialize (không dính ngoặc kép)
            const pttl = await this.redis.pttl(userHoldKey);

            // orphan nếu không thấy hold/expired/committed cho RID đang giữ
            const orphan =
                existingId &&
                !(await this.redis.get(holdKey(existingId))) &&
                !(await this.redis.get(`reservation:expired:${existingId}`)) &&
                !(await this.redis.get(`reservation:committed:${existingId}`));

            if (orphan) {
                try {
                    const sha = await this.ensureCompareDelSha(); // compare-del: chỉ DEL nếu value khớp
                    const delRes = await this.redis.evalsha(
                        sha,
                        [userHoldKey],
                        [existingId],
                    );
                    this.logger.warn(
                        "[reservation.create] cleared orphan user_hold",
                        { delRes, existingId },
                    );

                    // thử acquire lại
                    const reacq = await this.redis.setNXEx(
                        userHoldKey,
                        reservationId,
                        this.holdTtlSec,
                        { jitter: false },
                    );
                    if (reacq) {
                        this.logger.info(
                            "[reservation.create] reacquired after orphan cleanup",
                        );
                        acquired = true; // QUAN TRỌNG: cho flow đi tiếp
                    }
                } catch (e) {
                    this.logger.warn(
                        "[reservation.create] orphan cleanup failed",
                        { err: e?.message },
                    );
                }
            }

            if (!acquired) {
                const body = {
                    ok: false,
                    error: "USER_ALREADY_HAS_HOLD_FOR_EVENT",
                    reservationId: existingId || null,
                    retryAfterMs: Math.max(0, Number(pttl || 0)),
                };
                await setIdemFinal(this.redis, idemKey, 409, body);
                return { statusCode: 409, body };
            }
        }

        const reserved = [];
        try {
            // 4.2) Reserve all-or-nothing
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
                    invVersion: Number.isFinite(
                        Number(r?.invVersion ?? r?.version),
                    )
                        ? Number(r?.invVersion ?? r?.version)
                        : undefined,
                });
                this.logger.debug?.("[reservation.create] reserve.ok", {
                    ttId: l.ttId,
                    qty: l.qty,
                    shardIndex: r.shardIndex,
                    version: r.version,
                });
            }

            // 4.3) Persist hold (atomic Lua)
            try {
                if (!this.SHA_PERSIST_HOLD) {
                    this.SHA_PERSIST_HOLD =
                        await this.redis.scriptLoad(LUA_PERSIST_HOLD);
                }
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
                await this.redis.evalsha(
                    this.SHA_PERSIST_HOLD,
                    [holdKey(reservationId), holdZset],
                    [
                        String(this.holdTtlSec),
                        holdPayload,
                        String(expiresAt),
                        reservationId,
                    ],
                );
            } catch (e) {
                // NOSCRIPT fallback 1 lần
                if (String(e?.message || e).includes("NOSCRIPT")) {
                    this.SHA_PERSIST_HOLD =
                        await this.redis.scriptLoad(LUA_PERSIST_HOLD);
                    await this.redis.evalsha(
                        this.SHA_PERSIST_HOLD,
                        [holdKey(reservationId), holdZset],
                        [
                            String(this.holdTtlSec),
                            {
                                v: 1,
                                reservationId,
                                eventId,
                                userId: userId || null,
                                idemKey,
                                lines: reserved,
                                expiresAt,
                                ttlSec: this.holdTtlSec,
                                createdAt: Date.now(),
                                client: {
                                    ip: clientIp || null,
                                    ua: userAgent || null,
                                },
                                slug,
                            },
                            String(expiresAt),
                            reservationId,
                        ],
                    );
                } else {
                    throw e;
                }
            }

            // 4.4) Publish (best-effort)
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
                this.logger.warn("[reservation.publish] failed", e);
            }

            // 4.5) Push availability with version
            const maxVer = this._maxInvVersionFromLines(reserved);
            try {
                await this._publishAvailabilityWithVersionByEventId(eventId, {
                    invVersion: maxVer,
                    reason: "reserve",
                });
            } catch (e) {
                this.logger.debug?.(
                    "[reservation.create] avail publish failed",
                    { err: e?.message },
                );
            }

            // 4.6) Finalize idempotency
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
            // Rollback: unlock user_hold (compare-del)
            try {
                const sha = await this.ensureCompareDelSha();
                await this.redis.evalsha(sha, [userHoldKey], [reservationId]);
            } catch (e2) {
                this.logger.warn("[reservation.create] compare-del failed", {
                    err: e2?.message,
                });
            }

            // Release partial reservations if any
            if (reserved.length) {
                const outs = await Promise.allSettled(
                    reserved.map((rl) =>
                        this.eventInv.release(rl.ttId, {
                            qty: rl.qty,
                            shardIndex: rl.shardIndex,
                            eventId,
                            slug: `reservation:${reservationId}`,
                        }),
                    ),
                );
                const verFromRelease = outs.reduce((m, o) => {
                    const v = Number(
                        o?.status === "fulfilled"
                            ? (o.value?.invVersion ?? o.value?.version)
                            : NaN,
                    );
                    return Number.isFinite(v)
                        ? m == null
                            ? v
                            : Math.max(m, v)
                        : m;
                }, null);
                try {
                    await this._publishAvailabilityWithVersionByEventId(
                        eventId,
                        {
                            invVersion: verFromRelease,
                            reason: "rollback",
                        },
                    );
                } catch {}
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
    async cancelReservation({
        reservationId,
        reason = "USER_CANCEL",
        refundOnSucceeded = true,
    }) {
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
                    if (status === "SUCCEEDED" && refundOnSucceeded) {
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
        const outs = await Promise.allSettled(
            (hold.lines || []).map((l) =>
                this.eventInv.release(l.ttId, {
                    qty: l.qty,
                    shardIndex: l.shardIndex,
                    eventId: hold.eventId,
                    slug,
                }),
            ),
        );
        const maxVer = outs.reduce((m, o) => {
            const v = Number(
                o?.status === "fulfilled"
                    ? (o.value?.invVersion ?? o.value?.version)
                    : NaN,
            );
            return Number.isFinite(v) ? (m == null ? v : Math.max(m, v)) : m;
        }, null);

        try {
            await this._publishAvailabilityWithVersionByEventId(hold.eventId, {
                invVersion: maxVer,
                reason: "cancel",
            });
        } catch {}

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
                    noJitter: true,
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

            // Payment check (DB-first)
            if (this.paymentClient?.confirm) {
                const resp = await this.paymentClient.confirm({
                    reservationID: reservationId,
                    refresh: false,
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

            await this.redis
                .multi()
                .del(hKey)
                .zrem(holdZset, reservationId)
                .set(committedKey(reservationId), "1", {
                    ttl: 24 * 3600,
                    noJitter: true,
                })
                .exec();

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
                    invVersion: Number.isFinite(
                        Number(r?.invVersion ?? r?.version),
                    )
                        ? Number(r?.invVersion ?? r?.version)
                        : undefined,
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
                    noJitter: true,
                }),
            ]);

            const maxVer = this._maxInvVersionFromLines(reserved);
            try {
                await this._publishAvailabilityWithVersionByEventId(
                    snap.eventId,
                    {
                        invVersion: maxVer,
                        reason: "late-commit",
                    },
                );
            } catch {}

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

    async setBuyerClaim({
        reservationId,
        buyer = {},
        userId,
        clientIp,
        userAgent,
    }) {
        if (!reservationId) {
            return {
                statusCode: 400,
                body: { success: false, error: "RESERVATION_ID_REQUIRED" },
            };
        }

        // 1) Đã commit?
        const committed = await this.redis.getRaw(committedKey(reservationId));
        if (committed === "1") {
            return {
                statusCode: 409,
                body: { success: false, error: "ALREADY_COMMITTED" },
            };
        }

        // 2) Hold còn sống?
        const hKey = holdKey(reservationId);
        const hold = await this.redis.get(hKey);

        if (!hold) {
            const snap = await this.redis.get(
                `reservation:expired:${reservationId}`,
            );
            return {
                statusCode: 409,
                body: {
                    success: false,
                    error: snap ? "HOLD_EXPIRED" : "RESERVATION_NOT_FOUND",
                },
            };
        }

        // 3) TTL còn lại
        let ttlMs = 0;
        try {
            const pttl = await this.redis.pttl(hKey);
            ttlMs =
                pttl > 0
                    ? pttl
                    : Math.max(0, Number(hold.expiresAt || 0) - Date.now());
        } catch {
            ttlMs = Math.max(0, Number(hold.expiresAt || 0) - Date.now());
        }

        if (ttlMs <= 0) {
            return {
                statusCode: 409,
                body: { success: false, error: "HOLD_EXPIRED" },
            };
        }

        // 4) Sanitize input + tương thích name/fullName
        const safe = (s, n) => (typeof s === "string" ? s.slice(0, n) : null);
        const fullNameInput =
            buyer.fullName ?? buyer.name ?? buyer.displayName ?? null;

        const claim = {
            v: 1,
            reservationId,
            eventId: hold.eventId,
            userId: userId || hold.userId || null,
            buyer: {
                fullName: safe(fullNameInput, 160),
                email: safe(buyer.email, 254),
                phone: safe(buyer.phone, 32),
                note: safe(buyer.note, 1000),
                extra:
                    buyer.extra && typeof buyer.extra === "object"
                        ? buyer.extra
                        : null,
            },
            client: { ip: clientIp || null, ua: userAgent || null },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const ok = await this.redis.set(buyerClaimKey(reservationId), claim, {
            ttl: Math.ceil(ttlMs / 1000), // seconds
        });

        if (!ok) {
            return {
                statusCode: 500,
                body: { success: false, error: "CLAIM_PERSIST_FAILED" },
            };
        }

        // 6) Trả về format chuẩn { success, data }
        return {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    reservationId,
                    ttlMs,
                    claim: { userId: claim.userId, buyer: claim.buyer },
                    serverTime: Date.now(),
                },
            },
        };
    }
}
