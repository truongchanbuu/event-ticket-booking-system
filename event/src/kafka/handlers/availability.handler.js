// event/src/consumers/availability.handler.js
export async function handleAvailabilityMessage(payload, deps) {
    const { logger = console } = deps || {};
    const { decoded, message } = payload;

    // envelope do kafkaService.decodeEnvelope nhét vào payload.decoded
    const env = decoded || {};
    const p = env.payload || env.value || env.data || {};

    const eventId = p.eventId || p.eventID;
    const ttId = p.ticketTypeId || p.ttId;
    const invVersion = p.invVersion == null ? NaN : Number(p.invVersion); // robust: nhận string/số
    let slug = p.slug;

    if (!eventId || !ttId || Number.isNaN(invVersion)) {
        logger.warn("[availability.handler] skip invalid payload", {
            keys: Object.keys(p || {}),
        });
        return;
    }

    // deps
    const availabilityService = deps.availabilityService;
    const redis = deps.redis || deps.redisService || deps.redisClient; // KV
    const cache = deps.cache; // optional
    const redisPubSub = deps.redisPubSub; // <-- adapter publish

    if (!availabilityService || !redis) {
        throw new Error("Missing availabilityService or redis in deps");
    }

    // resolve slug nếu chưa có
    if (!slug && typeof availabilityService.getSlugById === "function") {
        slug = await availabilityService.getSlugById(eventId);
    }
    if (!slug) {
        logger.warn("[availability.handler] missing slug → skip", {
            eventId,
            ttId,
        });
        return;
    }

    // idempotent theo (eventId, ttId, invVersion)
    const verKey = `avail:lastver:${eventId}:${ttId}`;
    const last = Number((await redis.get(verKey)) || "0");
    if (invVersion <= last) return;

    // invalidate cache để getBySlug không trả cache cũ
    try {
        if (typeof availabilityService.invalidateBySlug === "function") {
            await availabilityService.invalidateBySlug(slug);
        } else if (
            typeof availabilityService.cacheKey === "function" &&
            cache?.del
        ) {
            await cache.del(availabilityService.cacheKey(slug));
        }
    } catch (e) {
        logger.warn("[availability.handler] cache invalidate failed", {
            slug,
            err: e?.message,
        });
    }

    // map eventId -> slug (hữu ích cho legacy)
    try {
        await redis.hset?.("event:slug", eventId, slug);
    } catch {}

    // lưu last version
    await redis.set(verKey, String(invVersion));

    // publish tín hiệu cho Broadcaster qua redisPubSub (fallback sang redis nếu cần)
    const msg = JSON.stringify({ slug, invVersion });
    if (redisPubSub?.publish) {
        await redisPubSub.publish(`availability:slug:${slug}`, msg);
    } else {
        await redis.publish(`availability:slug:${slug}`, msg);
    }

    logger.info("[availability.handler] ok", {
        slug,
        ttId,
        invVersion,
        offset: message?.offset,
    });
}
