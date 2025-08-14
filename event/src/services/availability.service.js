import { createHash } from "crypto";

import { EVENT_STATUS } from "../enums/event-status.js";
import {
    AppError,
    ERROR_CODE,
    sleep,
    withTimeout,
} from "@event_ticket_booking_system/shared";

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

    async getBySlug(slug, opts = {}) {
        const forceRefresh = !!opts.forceRefresh;

        const _rawMin = opts.minInvVersion;
        const minInvVersion = _rawMin == null ? undefined : Number(_rawMin);
        const hasMin = !(minInvVersion == null || Number.isNaN(minInvVersion));

        if (!slug) return { status: 400, data: { message: "Missing slug" } };

        const key = this.cacheKey(slug);

        if (this.ttlMs > 0 && !forceRefresh) {
            const cached = await this.cache.get(key);
            if (cached) {
                const cachedVer = Number(cached?._invVersion ?? -1);
                if (!hasMin || cachedVer >= minInvVersion) {
                    return { ...cached, _cacheHit: true };
                }
            }
        }

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
                        return payload;
                    }

                    const eventId = detail.eventID || detail.eventId;
                    if (!eventId) {
                        console.warn("[availability] missing eventId", {
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

                    if (!ticketTypeIds.length) {
                        const effInvVerEmpty = hasMin ? minInvVersion : 0;
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
                            await this.cache.set(key, payload, {
                                ttl: Math.ceil(this.ttlMs / 1000),
                                trackingKey: `event:${eventId}`,
                            });
                        }
                        return payload;
                    }

                    const invRes = await withTimeout(
                        () =>
                            this.inv.readAggregatedCountersWithVersion(
                                eventId,
                                ticketTypeIds,
                            ),
                        250,
                    );
                    const remains = invRes?.remains;
                    const invVerRead = Number(invRes?.invVersion ?? 0);

                    const safeRemains = ticketTypeIds.map((_, i) =>
                        Number.isFinite(remains?.[i]) ? remains[i] : 0,
                    );

                    const effInvVer = hasMin
                        ? Math.max(invVerRead, minInvVersion)
                        : invVerRead;

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
                        await this.cache.set(key, payload, {
                            ttl: Math.ceil(this.ttlMs / 1000),
                            trackingKey: `event:${eventId}`,
                        });
                    }

                    return payload;
                } catch (err) {
                    console.error("[availability] getBySlug failed", {
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

            this.inflight.set(slug, p);
            p.finally(() => this.inflight.delete(slug));
        }

        return this.inflight.get(slug);
    }
}
