export class AvailabilityService {
    constructor({
        redisService,
        eventService,
        inventoryService,
        logger = console,
        config,
    }) {
        this.cache = redisService;
        this.events = eventService;
        this.inv = inventoryService;
        this.logger = logger;
        this.ttlMs = config?.availability?.serverCacheTtlMs ?? 0;
        this.inflight = new Map();
        this.coalesceMs = config?.availability?.coalesceMs ?? 150;
    }

    cacheKey(slug) {
        return `availability:slug:${slug}`;
    }

    etagOf(total, status, ts) {
        return `W/"${total}:${status}:${ts}"`;
    }

    async getBySlug(slug) {
        if (!slug) return { status: 400, data: { message: "Missing slug" } };

        if (this.ttlMs > 0) {
            const cached = await this.cache.get(this.cacheKey(slug));
            if (cached) return { ...cached, _cacheHit: true };
        }

        if (!this.inflight.has(slug)) {
            const p = (async () => {
                await new Promise((r) => setTimeout(r, this.coalesceMs));
                const detail = await this.events.getPublicEventDetail(slug);
                if (!detail)
                    return { status: 404, data: { message: "Not found" } };
                if (detail.status === "CANCELLED")
                    return {
                        status: 410,
                        data: { message: "Event cancelled" },
                    };

                const ttIds = (detail.ticketTypes || [])
                    .map((t) => t.ticketTypeID)
                    .filter(Boolean);
                if (!ttIds.length) {
                    const ts = new Date().toISOString();
                    const payload = {
                        status: 200,
                        data: [],
                        lastUpdatedAt: ts,
                        etag: this.etagOf(0, "EMPTY", ts),
                    };
                    if (this.ttlMs)
                        await this.cache.set(
                            this.cacheKey(slug),
                            payload,
                            this.ttlMs,
                        );
                    return payload;
                }

                const remains = await this.inv.readCounters(ttIds);
                const data = ttIds.map((id, i) => ({
                    ticketTypeId: id,
                    remaining: remains[i],
                    isSoldOut: remains[i] <= 0,
                }));
                const total = remains.reduce((s, n) => s + n, 0);
                const status = total <= 0 ? "SOLD_OUT" : "ON_SALE";
                const ts = new Date().toISOString();
                const payload = {
                    status: 200,
                    data,
                    lastUpdatedAt: ts,
                    etag: this.etagOf(total, status, ts),
                };

                if (this.ttlMs)
                    await this.cache.set(
                        this.cacheKey(slug),
                        payload,
                        this.ttlMs,
                    );
                return payload;
            })();
            this.inflight.set(slug, p);
            p.finally(() => this.inflight.delete(slug));
        }

        return this.inflight.get(slug);
    }
}
