function safeJson(x) {
    if (!x) return null;
    if (typeof x === "object") return x;
    try {
        return JSON.parse(String(x));
    } catch {
        return null;
    }
}

/**
 * Handle 1 hoặc nhiều availability events từ Kafka.
 * message có:
 *   - eventId (string), ttId|ticketTypeId (string)
 *   - invVersion (number)  -- nếu có → dùng để dedupe mạnh
 *   - slug (string)        -- nếu không có → cố resolve qua availabilityService.getSlugById(eventId)
 *
 * retry:
 *  - Bắt buộc có redis, nếu publish/redis lỗi → throw để Kafka retry (vì đây là tín hiệu realtime)
 *  - Invalidate cache nếu có availabilityService; lỗi invalidate KHÔNG chặn publish (log warn)
 */
export async function handleAvailabilityMessage(payload, deps) {
    const logger = deps?.logger || console;
    const availabilityService = deps?.availabilityService || null;
    const redis = deps?.redis || deps?.redisService || deps?.redisClient;
    const redisPubSub = deps?.redisPubSub;

    // 1) Chuẩn hoá mảng sự kiện
    const env =
        payload?.decoded ??
        safeJson(payload?.message?.value) ??
        payload?.value ??
        payload;
    const raw = Array.isArray(env) ? env : [env];
    const events = raw.map((e) => {
        const p = e?.payload ?? e?.value ?? e?.data ?? e ?? {};
        return {
            eventId: p.eventId ?? p.eventID ?? p.event_id,
            ttId: p.ttId ?? p.ticketTypeId ?? p.ticket_type_id,
            invVersion: p.invVersion != null ? Number(p.invVersion) : NaN,
            slug: p.slug ?? p.eventSlug ?? null,
            // optional fields (không bắt buộc)
            remaining: p.remaining != null ? Number(p.remaining) : null,
            delta: p.delta != null ? Number(p.delta) : null,
        };
    });

    // 2) Lọc sự kiện hợp lệ tối thiểu (cần có eventId, và ttId hoặc invVersion/slug)
    const valid = events.filter(
        (e) => e.eventId && (e.ttId || e.slug || !Number.isNaN(e.invVersion)),
    );
    if (valid.length === 0) {
        logger.warn("[availability.handler] skip: no valid event", {
            keys: Object.keys(raw?.[0] || {}),
        });
        return;
    }

    // 3) Xử lý từng sự kiện
    for (const ev of valid) {
        // 3.1) Resolve slug nếu thiếu
        let slug = ev.slug || null;
        if (
            !slug &&
            availabilityService &&
            typeof availabilityService.getSlugById === "function"
        ) {
            try {
                slug = await availabilityService.getSlugById(ev.eventId);
            } catch (e) {
                logger.warn("[availability.handler] getSlugById failed", {
                    eventId: ev.eventId,
                    err: e?.message,
                });
            }
        }
        if (!slug) {
            logger.warn("[availability.handler] missing slug → skip", {
                eventId: ev.eventId,
                ttId: ev.ttId,
            });
            continue;
        }

        // 3.2) Dedupe theo invVersion nếu có
        if (!Number.isNaN(ev.invVersion) && ev.ttId) {
            const verKey = `avail:lastver:${ev.eventId}:${ev.ttId}`;
            const last = Number((await redis.get(verKey)) || "0");
            if (ev.invVersion <= last) {
                // cũ hơn → bỏ qua
                continue;
            }
            // invalidate cache (best-effort)
            try {
                if (availabilityService?.invalidateBySlug) {
                    await availabilityService.invalidateBySlug(slug);
                } else if (availabilityService?.cacheKey && deps?.cache?.del) {
                    await redis.del(availabilityService.cacheKey(slug));
                    await redis.del(availabilityService.etagKey(slug));
                }
            } catch (e) {
                logger.warn("[availability.handler] cache invalidate failed", {
                    slug,
                    err: e?.message,
                });
            }

            // ghi lại last version
            await redis.set(verKey, String(ev.invVersion)).catch(() => {});
            // lưu map eventId -> slug (hữu ích cho dịch vụ khác)
            await (redis?.hset ?? redis?.r?.hset)?.(
                "event:slug",
                ev.eventId,
                slug,
            ).catch(() => {});
        }

        // 3.3) Publish SSE nudge (bắt buộc; nếu fail → throw để Kafka retry)
        const msg = JSON.stringify({
            slug,
            invVersion: Number.isNaN(ev.invVersion) ? undefined : ev.invVersion,
        });
        const chan = `availability:slug:${slug}`;
        try {
            await (redisPubSub.publish ?? redis?.r?.publish).call(
                redisPubSub,
                chan,
                msg,
            );
            logger.info("[availability.handler] published", {
                slug,
                ttId: ev.ttId || null,
                invVersion: Number.isNaN(ev.invVersion) ? null : ev.invVersion,
                offset: payload?.message?.offset,
            });
        } catch (e) {
            // QUAN TRỌNG: throw để consumer retry vì publish thất bại → SSE sẽ hụt
            logger.error("[availability.handler] publish failed", {
                chan,
                err: e?.message,
            });
            throw e;
        }
    }
}
