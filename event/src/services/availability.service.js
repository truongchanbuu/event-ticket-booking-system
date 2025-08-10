import { createHash } from "crypto";

import { EVENT_STATUS } from "../enums/event-status.js";
import { sleep, withTimeout } from "@event_ticket_booking_system/shared";

const T_EVENTS_MS = 600; // detail theo slug (qua proxy)
const T_TICKETS_MS = 600; // ticket types
const T_INV_MS = 250; // redis (nhanh hơn)

export class AvailabilityService {
    constructor({
        redisService,
        eventService,
        inventoryService,
        ticketClientService,
        logger = console,
        config,
    }) {
        this.cache = redisService;
        this.events = eventService;
        this.inv = inventoryService;
        this.ticketClientService = ticketClientService;
        this.logger = logger;
        this.ttlMs = config?.availability?.serverCacheTtlMs ?? 0;
        this.inflight = new Map();
        this.coalesceMs = config?.availability?.coalesceMs ?? 150;
        this.MAX_INFLIGHT = 5000;
    }

    cacheKey(slug) {
        return `availability:slug:${slug}`;
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

    async getBySlug(slug) {
        if (!slug) return { status: 400, data: { message: "Missing slug" } };

        const key = this.cacheKey(slug);

        if (this.ttlMs > 0) {
            const cached = await this.cache.get(key);
            if (cached) return { ...cached, _cacheHit: true };
        }

        // ✅ Check inflight cap TRƯỚC khi tạo promise
        if (this.inflight.size >= this.MAX_INFLIGHT) {
            return { status: 503, data: { message: "Busy" } };
        }

        if (!this.inflight.has(slug)) {
            const p = (async () => {
                try {
                    await sleep(this.coalesceMs);

                    const detail = await withTimeout(
                        (signal) =>
                            this.events.getPublicEventDetail(slug, { signal }),
                        T_EVENTS_MS,
                    );

                    if (!detail) {
                        const payload = {
                            status: 404,
                            data: { message: "Not found" },
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
                        return payload;
                    }

                    const eventId = detail.eventID || detail.eventId;
                    if (!eventId) {
                        this.logger.warn("[availability] missing eventId", {
                            slug,
                            detailKeys: Object.keys(detail),
                        });
                        const payload = {
                            status: 404,
                            data: { message: "Not found" },
                        };
                        if (this.ttlMs)
                            await this.cache.set(key, payload, { ttl: 5 });
                        return payload;
                    }

                    // Tickets
                    const ttResp = await withTimeout(
                        () =>
                            this.ticketClientService.getEventTicketTypes(
                                eventId,
                            ),
                        500,
                    );
                    if (!ttResp || ttResp.status !== 200) {
                        this.logger.warn(
                            "[availability] ticket-service non-200",
                            { slug, eventId, status: ttResp?.status },
                        );
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

                    if (!ticketTypeIds.length) {
                        const payload = {
                            status: 200,
                            data: [],
                            lastUpdatedAt: new Date().toISOString(),
                            etag: this.etagOf(
                                0,
                                "EMPTY",
                                [],
                                ticketTypesVersion,
                                0,
                            ),
                        };
                        if (this.ttlMs) {
                            await this.cache.set(key, payload, {
                                ttl: Math.ceil(this.ttlMs / 1000),
                                trackingKey: `event:${eventId}`,
                            });
                        }
                        return payload;
                    }

                    // Inventory (timeout ngắn hơn)
                    const { remains, invVersion } = await withTimeout(
                        () =>
                            this.inv.readCountersWithVersion(
                                eventId,
                                ticketTypeIds,
                            ),
                        250,
                    );
                    const safeRemains = ticketTypeIds.map((_, i) =>
                        Number.isFinite(remains?.[i]) ? remains[i] : 0,
                    );

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
                            invVersion ?? 0,
                        ),
                    };

                    if (this.ttlMs) {
                        await this.cache.set(key, payload, {
                            ttl: Math.ceil(this.ttlMs / 1000),
                            trackingKey: `event:${eventId}`,
                        });
                    }
                    return payload;
                } catch (err) {
                    this.logger.error("[availability] getBySlug error", {
                        slug,
                        err,
                    });
                    return {
                        status: 503,
                        data: { message: "Service unavailable" },
                    };
                }
            })();

            this.inflight.set(slug, p);
            p.finally(() => this.inflight.delete(slug));
        }

        return this.inflight.get(slug);
    }
}

async function retryOnce(fn, delay = 50) {
    try {
        return await fn();
    } catch {
        await new Promise((r) => setTimeout(r, delay + Math.random() * delay));
        return fn();
    }
}
