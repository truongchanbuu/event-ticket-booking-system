import { createHash } from "crypto";
import { EVENT_STATUS } from "../enums/event-status.js";
import { sleep, withTimeout } from "@event_ticket_booking_system/shared";

/** Timeouts (ms) */
const T_EVENTS_MS = 600; // fetch event detail by slug
const T_TICKETS_MS = 600; // fetch ticket types
const T_INV_MS = 250; // read inventory (fast)

export class AvailabilityService {
    constructor({
        redisService, // KV (get/set/del)
        eventService, // events.getPublicEventDetail(slug)
        inventoryService, // inv.readAggregatedCountersWithVersion(eventId, ttIds)
        ticketClientService, // ticketClientService.getEventTicketTypes(eventId)
        logger = console,
        config,
    }) {
        this.cache = redisService;
        this.events = eventService;
        this.inv = inventoryService;
        this.ticketClientService = ticketClientService;
        this.logger = logger;

        this.ttlMs = config?.availability?.serverCacheTtlMs ?? 0; // payload cache TTL (ms)
        this.coalesceMs = config?.availability?.coalesceMs ?? 150; // micro-batching
        this.MAX_INFLIGHT = 5000;

        /** inflight: Map<string, {p: Promise<Payload>, min: number}> */
        this.inflight = new Map();
    }

    /** ------------ Keys & helpers ------------ */
    cacheKey(slug) {
        return `availability:slug:${slug}`;
    }
    etagKey(slug) {
        return `avail:etag:${slug}`;
    }

    etagOf(total, status, remains, ticketTypesVersion = 0, invVersion = 0) {
        const h = createHash("sha1");
        h.update(
            JSON.stringify({
                remains,
                ticketTypesVersion,
                invVersion,
                total,
                status,
            }),
        );
        const b64 = h.digest("base64url"); // ngắn, URL-safe
        return `W/"${b64}"`;
    }

    async setEtag(slug, etag, ttlSecHint) {
        if (!slug || !etag) return;
        const ttlSec =
            Number.isFinite(ttlSecHint) && ttlSecHint > 0
                ? Math.floor(ttlSecHint)
                : Math.max(5, Math.ceil((this.ttlMs || 0) / 1000) || 30);
        try {
            await this.cache.set(this.etagKey(slug), etag, { ttl: ttlSec });
        } catch (e) {
            this.logger?.warn?.("[availability] setEtag failed", {
                slug,
                err: e?.message,
            });
        }
    }

    async peekEtag(slug) {
        if (!slug) return null;
        try {
            const et = await this.cache.get(this.etagKey(slug));
            if (typeof et === "string" && et.length) return et;

            const cached = await this.cache.get(this.cacheKey(slug));
            return typeof cached?.etag === "string" ? cached.etag : null;
        } catch {
            return null;
        }
    }

    async invalidateBySlug(slug) {
        if (!slug) return;
        try {
            await this.cache.del(this.cacheKey(slug));
            await this.cache.del(this.etagKey(slug));
        } catch (e) {
            this.logger?.warn?.("[availability] invalidateBySlug failed", {
                slug,
                err: e?.message,
            });
        }
    }

    /** ------------ Core API ------------ */
    async getBySlug(slug, opts = {}) {
        const forceRefresh = !!opts.forceRefresh;
        const rawMin = opts.minInvVersion;
        const minInvVersion = rawMin == null ? undefined : Number(rawMin);
        const hasMin = !(minInvVersion == null || Number.isNaN(minInvVersion));

        if (!slug) return { status: 400, data: { message: "Missing slug" } };

        const key = this.cacheKey(slug);
        const ttlSecPayload = Math.ceil((this.ttlMs || 0) / 1000);

        // 1) try fast server cache (honor minInvVersion)
        if (this.ttlMs > 0 && !forceRefresh) {
            const cached = await this.cache.get(key);
            if (cached) {
                const cachedVer = Number(cached?._invVersion ?? -1);
                if (!hasMin || cachedVer >= minInvVersion) {
                    return { ...cached, _cacheHit: true };
                }
            }
        }

        // 2) inflight coalesce (xét minInvVersion)
        if (this.inflight.size >= this.MAX_INFLIGHT) {
            return { status: 503, data: { message: "Busy" } };
        }

        const wantMin = hasMin ? minInvVersion : 0;
        const ent = this.inflight.get(slug);
        if (!ent || forceRefresh || wantMin > ent.min) {
            // dùng min lớn hơn trong số các requester → đảm bảo đáp ứng mọi caller
            const effectiveMin = forceRefresh
                ? wantMin
                : Math.max(wantMin, ent?.min ?? 0);

            const p = (async () => {
                try {
                    // micro-batching
                    await sleep(this.coalesceMs);

                    // 2.1) Event detail
                    const detail = await withTimeout(
                        (signal) =>
                            this.events.getPublicEventDetail(slug, { signal }),
                        T_EVENTS_MS,
                    );

                    if (!detail) {
                        const payload = {
                            status: 404,
                            data: { message: "Not found." },
                        };
                        if (this.ttlMs)
                            await this.cache.set(key, payload, { ttl: 5 });
                        return payload;
                    }

                    if (detail.status === EVENT_STATUS.CANCELLED) {
                        const payload = {
                            status: 410,
                            data: { message: "Event cancelled" },
                        };
                        if (this.ttlMs) {
                            await this.cache.set(key, payload, {
                                ttl: 5,
                                trackingKey: `event:${detail.eventID || detail.eventId}`,
                            });
                        }
                        // Luôn xóa ETag để client không 304 sau khi CANCELLED
                        await this.cache.del(this.etagKey(slug));
                        return payload;
                    }

                    const eventId = detail.eventID || detail.eventId;
                    if (!eventId) {
                        const payload = {
                            status: 404,
                            data: { message: "Not found" },
                        };
                        if (this.ttlMs)
                            await this.cache.set(key, payload, { ttl: 5 });
                        return payload;
                    }

                    // 2.2) Ticket types
                    const ttResp = await withTimeout(
                        () =>
                            this.ticketClientService.getEventTicketTypes(
                                eventId,
                            ),
                        T_TICKETS_MS,
                    );
                    if (!ttResp || ttResp.status !== 200) {
                        return {
                            status: 503,
                            data: { message: "Service unavailable" },
                        };
                    }

                    const ttItems = Array.isArray(ttResp.data)
                        ? ttResp.data
                        : [];
                    const ticketTypeIds = ttItems
                        .map((t) => t.ticketTypeID || t.id)
                        .filter(Boolean);
                    const ticketTypesVersion =
                        (Number.isFinite(ttResp.version)
                            ? ttResp.version
                            : null) ??
                        createHash("sha1")
                            .update(ticketTypeIds.join(","))
                            .digest("base64url");

                    // 2.3) No TT → empty payload (vẫn có ETag/Version)
                    if (!ticketTypeIds.length) {
                        const effInvVerEmpty = effectiveMin || 0;
                        const payload = {
                            status: 200,
                            data: [],
                            lastUpdatedAt: new Date().toISOString(),
                            etag: this.etagOf(
                                0,
                                "EMPTY",
                                [],
                                ticketTypesVersion,
                                effInvVerEmpty,
                            ),
                            _invVersion: effInvVerEmpty,
                        };
                        if (this.ttlMs) {
                            const ttl = ttlSecPayload;
                            await this.cache.set(key, payload, {
                                ttl,
                                trackingKey: `event:${eventId}`,
                            });
                        }
                        await this.setEtag(slug, payload.etag, ttlSecPayload);
                        return payload;
                    }

                    // 2.4) Inventory read (with version)
                    const invRes = await withTimeout(
                        () =>
                            this.inv.readAggregatedCountersWithVersion(
                                eventId,
                                ticketTypeIds,
                            ),
                        T_INV_MS,
                    );
                    const remains = invRes?.remains;
                    const invVerRead = Number(invRes?.invVersion ?? 0);

                    const safeRemains = ticketTypeIds.map((_, i) =>
                        Number.isFinite(remains?.[i]) ? remains[i] : 0,
                    );
                    const effInvVer = Math.max(invVerRead, effectiveMin || 0);

                    const data = ticketTypeIds.map((id, i) => ({
                        ticketTypeId: id,
                        remaining: safeRemains[i],
                        isSoldOut: safeRemains[i] <= 0,
                        name: ttItems[i]?.name,
                        price: ttItems[i]?.price,
                        currency: ttItems[i]?.currency,
                    }));

                    const total = safeRemains.reduce((s, n) => s + n, 0);
                    const status = total <= 0 ? "SOLD_OUT" : "ON_SALE";

                    const payload = {
                        status: 200,
                        data,
                        lastUpdatedAt: new Date().toISOString(),
                        etag: this.etagOf(
                            total,
                            status,
                            safeRemains,
                            ticketTypesVersion,
                            effInvVer,
                        ),
                        _invVersion: effInvVer,
                    };

                    if (this.ttlMs) {
                        const ttl = ttlSecPayload;
                        await this.cache.set(key, payload, {
                            ttl,
                            trackingKey: `event:${eventId}`,
                        });
                    }
                    await this.setEtag(slug, payload.etag, ttlSecPayload);

                    return payload;
                } catch (err) {
                    this.logger?.error?.("[availability] getBySlug failed", {
                        slug,
                        e: err?.message,
                        code: err?.code,
                        name: err?.name,
                        stack: err?.stack,
                    });
                    return {
                        status: 503,
                        data: { message: "Service unavailable" },
                    };
                }
            })();

            this.inflight.set(slug, { p, min: effectiveMin });
            p.finally(() => {
                const cur = this.inflight.get(slug);
                if (cur?.p === p) this.inflight.delete(slug);
            });
        }

        // 3) trả promise inflight hiện tại
        return this.inflight.get(slug).p;
    }
}
