export class InventoryService {
    constructor({ redisService, logger = console, pubsub }) {
        this.redis = redisService;
        this.logger = logger;
        this.pubsub = pubsub;
        this.shas = { reserve: null, release: null };
    }

    invKey(ttId) {
        return `inv:${ttId}:remaining`;
    }

    invVersionKey(eventId) {
        return `event:${eventId}:inv:version`;
    }

    async initialize({ reserveLua, releaseLua }) {
        this.shas.reserve = await this.redis.scriptLoad(reserveLua);
        this.shas.release = await this.redis.scriptLoad(releaseLua);
        this.logger.info("[inventory] Lua loaded", this.shas);
    }

    async readCounters(ttIds = []) {
        if (!ttIds.length) return [];
        const keys = ttIds.map((id) => this.invKey(id));
        const raw = await this.redis.mgetRaw(keys);
        return raw.map((v) => {
            const n = Number(v ?? 0);
            return Number.isFinite(n) ? Math.max(0, n) : 0;
        });
    }

    async readCountersWithVersion(eventId, ttIds = []) {
        if (!ttIds.length) return { remains: [], invVersion: 0 };

        if (this.redis.pipeline) {
            const pipe = this.redis.pipeline();
            const keys = ttIds.map((id) => this.invKey(id));
            keys.forEach((k) => pipe.getRaw?.(k) ?? pipe.get(k));
            pipe.get(this.invVersionKey(eventId));
            const replies = await pipe.exec();
            const rawRemains = replies.slice(0, keys.length).map((r) => r[1]);
            const rawVersion = replies[keys.length][1];

            const remains = rawRemains.map((v) => {
                const n = Number(v ?? 0);
                return Number.isFinite(n) ? Math.max(0, n) : 0;
            });
            const invVersion = Number(rawVersion ?? 0);
            return {
                remains,
                invVersion: Number.isFinite(invVersion) ? invVersion : 0,
            };
        }

        const keys = ttIds.map((id) => this.invKey(id));
        const [rawRemains, rawVersion] = await Promise.all([
            this.redis.mgetRaw(keys),
            this.redis.get(this.invVersionKey(eventId)),
        ]);

        const remains = rawRemains.map((v) => {
            const n = Number(v ?? 0);
            return Number.isFinite(n) ? Math.max(0, n) : 0;
        });
        const invVersion = Number(rawVersion ?? 0);
        return {
            remains,
            invVersion: Number.isFinite(invVersion) ? invVersion : 0,
        };
    }

    async reserve(ttId, qty, { eventId, slug } = {}) {
        if (!this.shas.reserve) {
            this.logger.error("[inventory.reserve] Lua SHA missing");
            throw new Error("Reserve script not initialized");
        }

        const [ok, val] = await this.redis.evalsha(
            this.shas.reserve,
            [this.invKey(ttId)],
            [String(qty)],
        );

        const res =
            ok === 1
                ? { ok: true, newRemaining: Number(val) }
                : { ok: false, currentRemaining: Number(val) };

        // Version bump khi có thay đổi
        if (eventId && res.ok) {
            try {
                await this.redis.incr(this.invVersionKey(eventId));
            } catch (e) {
                this.logger.warn("[inventory.version] incr failed", {
                    e: e.message,
                    eventId,
                    ttId,
                    qty,
                });
            }
        }

        // Pub/Sub + cache invalidation
        if (this.pubsub && eventId) {
            try {
                await this.pubsub.publish(
                    `availability:${eventId}`,
                    JSON.stringify({
                        eventId,
                        slug, // 👈 thêm slug nếu biết
                        ticketTypeId: ttId,
                        remaining:
                            res.newRemaining ?? res.currentRemaining ?? 0,
                        ts: new Date().toISOString(),
                        action: "reserve",
                        qty: Number(qty),
                    }),
                );
            } catch (e) {
                this.logger.warn("[availability.pub] failed", {
                    e: e.message,
                    eventId,
                    ttId,
                    qty,
                });
            }

            try {
                if (slug) {
                    await this.redis.del(`availability:slug:${slug}`);
                } else {
                    await this.redis.invalidateByTrackingKey(
                        `event:${eventId}`,
                    );
                }
            } catch (e) {
                this.logger.warn("[availability.invalidate] failed", {
                    e: e.message,
                    eventId,
                    slug,
                    ttId,
                });
            }
        }

        return res;
    }

    async release(ttId, qty, { eventId, slug } = {}) {
        if (!this.shas.release) {
            this.logger.error("[inventory.release] Lua SHA missing");
            throw new Error("Release script not initialized");
        }

        const [ok, newRemaining] = await this.redis.evalsha(
            this.shas.release,
            [this.invKey(ttId)],
            [String(qty)],
        );

        if (eventId && ok === 1) {
            try {
                await this.redis.incr(this.invVersionKey(eventId));
            } catch (e) {
                this.logger.warn("[inventory.version] incr failed", {
                    e: e.message,
                    eventId,
                    ttId,
                    qty,
                });
            }
        }

        if (this.pubsub && eventId) {
            try {
                await this.pubsub.publish(
                    `availability:${eventId}`,
                    JSON.stringify({
                        eventId,
                        slug,
                        ticketTypeId: ttId,
                        remaining: Number(newRemaining),
                        ts: new Date().toISOString(),
                        action: "release",
                        qty: Number(qty),
                    }),
                );
            } catch (e) {
                this.logger.warn("[availability.pub] failed", {
                    e: e.message,
                    eventId,
                    ttId,
                    qty,
                });
            }

            try {
                if (slug) {
                    await this.redis.del(`availability:slug:${slug}`);
                } else {
                    await this.redis.invalidateByTrackingKey(
                        `event:${eventId}`,
                    );
                }
            } catch (e) {
                this.logger.warn("[availability.invalidate] failed", {
                    e: e.message,
                    eventId,
                    slug,
                    ttId,
                });
            }
        }

        return { ok: ok === 1, newRemaining: Number(newRemaining) };
    }
}
