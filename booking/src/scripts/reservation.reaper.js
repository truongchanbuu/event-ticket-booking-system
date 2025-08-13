/**
 * ReservationReaper
 * Quét các hold đã hết hạn, release inventory và dọn dữ liệu một cách an toàn.
 *
 * - Bảo vệ concurrency: lock:reap:<id> với token + compare-del khi unlock
 * - Xóa user_hold:* bằng EVALSHA compare-del chỉ khi value == reservationId
 * - Publish ReservationExpired sau khi cleanup thành công
 * - Log metrics nhẹ theo từng tick
 *
 * Yêu cầu Redis client hỗ trợ:
 *  - scriptLoad(lua) -> sha
 *  - evalsha(sha, keys[], argv[])
 *  - zrangebyscore / zrem / get / set / del
 *
 * @example
 * const reaper = new ReservationReaper({ redisClient, eventInventoryClient, reservationProducer, logger, config });
 * await reaper.start();
 */
export class ReservationReaper {
    /**
     * @param {Object} deps
     * @param {any} deps.redisClient - Redis client (ioredis/upstash compatible APIs used below)
     * @param {any} deps.eventInventoryClient - Has method release(ttId, { qty, shardIndex, eventId, slug })
     * @param {any} [deps.reservationProducer] - Optional, has sendReservationExpired(payload, { key })
     * @param {Console} [deps.logger=console]
     * @param {Object} [deps.config={}] - { reaper: { enabled, batchSize, tickMs, lockTtl } }
     */
    constructor({
        redisService,
        eventInventoryClient,
        reservationProducer,
        logger = console,
        config = {},
    }) {
        this.redis = redisService;
        this.eventInv = eventInventoryClient;
        this.reservationProducer = reservationProducer;
        this.logger = logger;
        this.config = config;
        this.interval = null;

        const c = config.reaper || {};
        this.batchSize = Number(c.batchSize ?? 300);
        this.tickMs = Number(c.tickMs ?? 1500);
        this.lockTtl = Number(c.lockTtl ?? 10); // seconds
        this.enabled = Boolean(c.enabled ?? false);

        /** @type {string|null} */
        this._compareDelSha = null;
    }

    async start() {
        if (!this.enabled) {
            this.logger.info("[reaper] disabled by config");
            return;
        }
        if (this.interval) return;

        this.logger.info("[reaper] starting...", {
            tickMs: this.tickMs,
            batchSize: this.batchSize,
            lockTtl: this.lockTtl,
        });

        this.interval = setInterval(() => {
            this._tick().catch((e) => {
                this.logger.warn("[reaper.tick] error", e?.message);
            });
        }, this.tickMs);
        this.interval.unref?.();
    }

    async stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    /** Lazy load & cache compare-del lua script */
    async _ensureCompareDel() {
        if (this._compareDelSha) return this._compareDelSha;
        const sha = await this.redis.scriptLoad(`
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `);
        this._compareDelSha = sha;
        return sha;
    }

    /** Safe unlock using token compare-del */
    async _safeUnlock(lockKey, token) {
        if (!lockKey || !token) return;
        try {
            const sha = await this._ensureCompareDel();
            await this.redis.evalsha(sha, [lockKey], [token]);
        } catch (e) {
            this.logger.debug?.("[reaper] safeUnlock failed (ignored)", {
                lockKey,
                e: e?.message,
            });
        }
    }

    async _tick() {
        const tTickStart = Date.now();
        let mProcessed = 0,
            mCleaned = 0,
            mMissing = 0,
            mSkipped = 0,
            mLineOk = 0,
            mLineFail = 0;

        const now = Date.now();
        const ids = await this.redis.zrangebyscore(
            "hold_expiries",
            0,
            now,
            "LIMIT",
            0,
            this.batchSize,
        );
        if (!ids?.length) return;

        const compareDelSha = await this._ensureCompareDel();

        for (const reservationId of ids) {
            mProcessed++;
            const lockKey = `lock:reap:${reservationId}`;
            const token = `${now}-${Math.random().toString(36).slice(2)}`; // unique per attempt

            // Acquire lock
            const got = await this.redis.setNXEx(lockKey, token, this.lockTtl, {
                jitter: false,
            });
            if (!got) continue;

            try {
                const hKey = `hold:${reservationId}`;
                const raw = await this.redis.get(hKey);

                // Edge: hold missing but still in ZSET -> just zrem
                if (!raw) {
                    await this.redis.zrem("hold_expiries", reservationId);
                    await this._safeUnlock(lockKey, token);
                    mMissing++;
                    continue;
                }

                /** @type {{eventId:string, userId?:string|null, client?:{ip?:string}, slug?:string, expiresAt?:number, lines?:Array<{ttId:string, qty:number, shardIndex?:number}>}} */
                const hold = typeof raw === "string" ? JSON.parse(raw) : raw;
                const slug = hold.slug || `reservation:${reservationId}`;

                // Edge: clock skew -> not actually expired; skip (do not zrem)
                if (hold.expiresAt && hold.expiresAt > Date.now()) {
                    await this._safeUnlock(lockKey, token);
                    mSkipped++;
                    continue;
                }

                // Release all lines (best-effort per line)
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

                for (const o of outs) {
                    if (o.status === "fulfilled" && o.value?.ok !== false)
                        mLineOk++;
                    else mLineFail++;
                }

                const anyFail = outs.some(
                    (o) => o.status === "rejected" || o.value?.ok === false,
                );
                if (anyFail) {
                    // keep data for retry next tick
                    await this._safeUnlock(lockKey, token);
                    continue;
                }

                // Safe remove user_hold only if matches reservationId
                const userHoldKey = hold.userId
                    ? `user_hold:${hold.userId}:${hold.eventId}`
                    : `user_hold_ip:${hold?.client?.ip ?? ""}:${hold.eventId}`;
                await this.redis.evalsha(
                    compareDelSha,
                    [userHoldKey],
                    [reservationId],
                );

                try {
                    const graceMs = Number(
                        this.config?.reservation?.graceMs ?? 0,
                    );
                    if (graceMs > 0) {
                        // 1) Lưu snapshot (để late payment có thể re-reserve)
                        const snapKey = `reservation:expired:${reservationId}`;
                        const snapTtlSec = Math.ceil((graceMs + 30_000) / 1000); // buffer 30s
                        const snapshot = {
                            v: 1,
                            reservationId,
                            eventId: hold.eventId,
                            userId: hold.userId || null,
                            lines: hold.lines || [],
                            expiredAt: hold.expiresAt,
                            createdAt: hold.createdAt,
                        };

                        await this.redis.set(snapKey, snapshot, {
                            ttl: snapTtlSec,
                        });

                        const when = Number(hold.expiresAt) + graceMs;
                        await this.redis.zadd(
                            "auto_cancel:due",
                            when,
                            reservationId,
                        );
                    }
                } catch (e) {
                    this.logger.warn("[reaper] snapshot/schedule failed", {
                        reservationId,
                        e: e?.message,
                    });
                }

                // Cleanup data
                await Promise.allSettled([
                    this.redis.del(hKey),
                    this.redis.zrem("hold_expiries", reservationId),
                ]);

                // Publish ReservationExpired (idempotent by key)
                try {
                    if (this.reservationProducer?.sendReservationExpired) {
                        await this.reservationProducer.sendReservationExpired(
                            {
                                reservationId,
                                eventId: hold.eventId,
                                expiredAt: Date.now(),
                                lines: hold.lines || [],
                                reason: "HOLD_EXPIRED",
                                slug,
                                userId: hold.userId ?? null,
                                clientIp: hold?.client?.ip ?? null,
                            },
                            { key: reservationId },
                        );
                    }
                } catch (pubErr) {
                    this.logger.warn(
                        "[reaper] publish ReservationExpired failed",
                        {
                            reservationId,
                            e: pubErr?.message,
                        },
                    );
                    // Do not rollback cleanup; downstream should be idempotent.
                }

                // Finally unlock
                await this._safeUnlock(lockKey, token);
                mCleaned++;
            } catch (e) {
                this.logger.warn("[reaper] failed", {
                    reservationId,
                    e: e?.message,
                });
                await this._safeUnlock(lockKey, token);
            }
        }

        // Tick metrics
        const ms = Date.now() - tTickStart;
        this.logger.info("[reaper.tick] summary", {
            processed: mProcessed,
            cleaned: mCleaned,
            missing: mMissing,
            skipped: mSkipped,
            lineOk: mLineOk,
            lineFail: mLineFail,
            latencyMs: ms,
        });
    }
}
