import { EVENT_STATUS } from "../enums/event-status.js";
import {
    availabilityCacheHit,
    availabilityCacheMiss,
} from "../metrics/availability.metric.js";

export class AvailabilityService {
    constructor({ redisService, eventService, logger = console, config }) {
        this.redis = redisService;
        this.events = eventService;
        this.logger = logger;
        this.shas = { reserve: null, release: null };
        this.serverCacheTtlMs = config?.availability?.serverCacheTtlMs ?? 0;
    }

    async initialize({ reserveLua, releaseLua }) {
        if (!reserveLua || !releaseLua) {
            throw new Error(
                "Lua scripts missing: reserve/release are required",
            );
        }

        this.shas.reserve = await this.redis.scriptLoad(reserveLua);
        this.shas.release = await this.redis.scriptLoad(releaseLua);
        this.logger.info(
            `[AvailabilityService] Lua loaded: reserve=${this.reserveSha}, release=${this.releaseSha}`,
        );
    }

    // Key builder
    invKey(ttId) {
        return `inv:${ttId}:remaining`;
    }

    async getAvailabilityBySlug(slug) {
        if (!slug) return null;

        const cacheKey =
            this.serverCacheTtlMs > 0 ? `availability:slug:${slug}` : null;
        if (cacheKey) {
            const cached = await this.redis.get(cacheKey);

            // Metric
            if (cached) {
                availabilityCacheHit.inc();
                cached._cacheHit = true;
                return cached;
            }
            availabilityCacheMiss.inc();
        }

        const detail = await this.events.getPublicEventDetail(slug);
        if (!detail) return { status: 404 };
        if (detail.status === EVENT_STATUS.CANCELLED) return { status: 410 };

        const ticketTypeIDs = (detail.ticketTypes || []).map(
            (t) => t.ticketTypeID,
        );
        if (ticketTypeIDs.length === 0) return { status: 200, data: [] };

        const keys = ticketTypeIDs.map((tt) => `inv:${tt}:remaining`);
        const raw = await this.redis.mgetRaw(keys);
        const data = ticketTypeIDs.map((tt, i) => {
            const n = Number(raw[i] ?? 0);
            const available = Number.isFinite(n) ? Math.max(n, 0) : 0;
            return { ticketTypeId: tt, available, isSoldOut: available === 0 };
        });

        const result = { status: 200, data };

        if (cacheKey) {
            await this.redis.set(cacheKey, result, {
                ttl: Math.floor(this.serverCacheTtlMs / 1000),
            });
        }

        result._cacheHit = false;

        return result;
    }

    /**
     * Reserve inventory (write path) — dùng trong flow đặt vé
     * Trả: { ok: boolean, newRemaining?, currentRemaining? }
     */
    async reserve(ttId, qty) {
        if (!this.shas.reserve) throw new Error("Lua reserve not loaded");
        const key = this.invKey(ttId);
        const [ok, newOrCur] = await this.redis.evalsha(
            this.shas.reserve,
            [key],
            [String(qty)],
        );

        if (ok === 1) return { ok: true, newRemaining: Number(newOrCur) };
        return { ok: false, currentRemaining: Number(newOrCur) };
    }

    /**
     * Release inventory (write path) — khi huỷ giữ chỗ/thanh toán fail
     */
    async release(ttId, qty) {
        if (!this.shas.release) throw new Error("Lua release not loaded");
        const key = this.invKey(ttId);
        const [ok, newRemaining] = await this.redis.evalsha(
            this.shas.release,
            [key],
            [qty],
        );
        return { ok: ok === 1, newRemaining: Number(newRemaining) };
    }
}
