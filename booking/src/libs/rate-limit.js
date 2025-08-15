export async function rateLimitOncePerMinute(redis, identity, windowSec = 60) {
    const key = `rl:minute:${identity}`;
    try {
        const n = await redis.incr(key); // 1, 2, 3, ...
        if (n === 1) {
            await redis.expire(key, windowSec);
        }
        if (n > 1) {
            let ttlSec = windowSec;
            try {
                const t = await redis.ttl(key);
                if (t > 0) ttlSec = t;
            } catch {}
            return { allowed: false, retryAfterSec: ttlSec };
        }
        return { allowed: true, retryAfterSec: 0 };
    } catch {
        return { allowed: true, retryAfterSec: 0 };
    }
}

/**
 * Rate limit 1 lần trong windowSec cho mỗi identity.
 * Ưu tiên dùng RedisService.setNXEx nếu có; fallback dùng raw SET NX EX.
 * Fail-open nếu Redis lỗi.
 */
export async function rateLimitOncePerWindow(
    redis, // RedisService hoặc raw client
    key, // rl:<route>:once:<identity>
    windowSec = 60,
    jitterSec = 3, // chống herd: +0..jitterSec
) {
    const ttl = windowSec + Math.floor(Math.random() * Math.max(0, jitterSec));
    try {
        // 1) cố dùng helper setNXEx của bạn
        if (typeof redis.setNXEx === "function") {
            const ok = await redis.setNXEx(key, ttl, "1", { jitter: false });
            if (ok) return { allowed: true, retryAfterSec: 0 };

            let t = await (redis.ttl?.(key) ?? -1);
            if (t === -1 && typeof redis.expire === "function") {
                await redis.expire(key, ttl);
                t = ttl;
            }
            if (t < 0) t = ttl;
            return { allowed: false, retryAfterSec: t };
        }

        // 2) fallback raw client: SET key 1 NX EX <ttl>
        const res = await redis.set(key, "1", "NX", "EX", ttl);
        if (res === "OK" || res === true)
            return { allowed: true, retryAfterSec: 0 };

        let t = await (redis.ttl?.(key) ?? -1);
        if (t === -1 && typeof redis.expire === "function") {
            await redis.expire(key, ttl);
            t = ttl;
        }
        if (t < 0) t = ttl;
        return { allowed: false, retryAfterSec: t };
    } catch {
        // Fail-open cho public API
        return { allowed: true, retryAfterSec: 0 };
    }
}

export function getClientIdentity(req) {
    const userId = req.get?.("x-user-id") || null;
    const xff = req.get?.("x-forwarded-for");
    const ip =
        (xff ? String(xff).split(",")[0].trim() : null) ||
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown";
    return { userId: userId || null, ip };
}

export function rlKeyOncePerWindow(routeKey, id) {
    const who = id.userId ? `uid:${id.userId}` : `ip:${id.ip}`;
    return `rl:${routeKey}:once:${who}`;
}

export function rlKeyFixedWindow(routeKey, id) {
    const who = id.userId ? `uid:${id.userId}` : `ip:${id.ip}`;
    return `rl:${routeKey}:fw:${who}`;
}
