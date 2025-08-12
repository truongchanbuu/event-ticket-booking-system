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
