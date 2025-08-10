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

    // 🔹 key version cho event
    invVersionKey(eventId) {
        return `event:${eventId}:inv:version`;
    }

    async initialize({ reserveLua, releaseLua }) {
        this.shas.reserve = await this.redis.scriptLoad(reserveLua);
        this.shas.release = await this.redis.scriptLoad(releaseLua);
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

    // 🔹 Tier 1: đọc remains + invVersion (2 round-trips, đủ prod)
    async readCountersWithVersion(eventId, ttIds = []) {
        if (!ttIds.length) return { remains: [], invVersion: 0 };

        const keys = ttIds.map((id) => this.invKey(id));

        // Nếu redisService có hỗ trợ pipeline/multi, dùng cho 1 round-trip.
        // Ở đây dùng 2 lệnh cho đơn giản (đủ Tier 1).
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
        const [ok, val] = await this.redis.evalsha(
            this.shas.reserve,
            [this.invKey(ttId)],
            [String(qty)],
        );

        const res =
            ok === 1
                ? { ok: true, newRemaining: Number(val) }
                : { ok: false, currentRemaining: Number(val) };

        // 🔹 INCR inv version khi thực sự trừ được vé
        if (eventId && res.ok) {
            try {
                await this.redis.incr(this.invVersionKey(eventId));
            } catch (e) {
                this.logger.warn("[inventory.version] incr failed", {
                    e: e.message,
                    eventId,
                });
            }
        }

        // publish domain event + invalidate cache (bạn đã có sẵn)
        if (this.pubsub && eventId) {
            await this.pubsub.publish(
                `availability:${eventId}`,
                JSON.stringify({
                    eventId,
                    ticketTypeId: ttId,
                    remaining: res.newRemaining ?? res.currentRemaining ?? 0,
                    ts: new Date().toISOString(),
                }),
            );

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
                });
            }
        }

        return res;
    }

    async release(ttId, qty, { eventId, slug } = {}) {
        const [ok, newRemaining] = await this.redis.evalsha(
            this.shas.release,
            [this.invKey(ttId)],
            [String(qty)],
        );

        // 🔹 INCR inv version (release thành công hay không tuỳ logic,
        // ở đây ok===1 mới tăng để phản ánh thay đổi)
        if (eventId && ok === 1) {
            try {
                await this.redis.incr(this.invVersionKey(eventId));
            } catch (e) {
                this.logger.warn("[inventory.version] incr failed", {
                    e: e.message,
                    eventId,
                });
            }
        }

        if (this.pubsub && eventId) {
            await this.pubsub.publish(
                `availability:${eventId}`,
                JSON.stringify({
                    eventId,
                    ticketTypeId: ttId,
                    remaining: Number(newRemaining),
                    ts: new Date().toISOString(),
                }),
            );

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
                });
            }
        }
        return { ok: ok === 1, newRemaining: Number(newRemaining) };
    }
}
