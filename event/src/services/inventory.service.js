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
        // publish domain event
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
        }
        return res;
    }

    async release(ttId, qty, { eventId, slug } = {}) {
        const [ok, newRemaining] = await this.redis.evalsha(
            this.shas.release,
            [this.invKey(ttId)],
            [String(qty)],
        );
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
        }
        return { ok: ok === 1, newRemaining: Number(newRemaining) };
    }
}
