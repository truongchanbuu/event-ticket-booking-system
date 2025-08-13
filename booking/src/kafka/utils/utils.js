export function ttlRemainingMs(hold) {
    return Math.max(0, Number(hold.expiresAt || 0) - Date.now());
}

export async function updateHoldMetaKeepTtl(redis, reservationId, patch) {
    const hKey = `hold:${reservationId}`;

    // 1) Nạp hold hiện tại (RedisService.get -> đã JSON.parse + prefix sẵn)
    const curr = await redis.get(hKey);
    if (!curr) return { exists: false };

    // 2) Merge patch
    const next = {
        ...curr,
        payment: {
            ...(curr.payment || {}),
            ...patch,
            lastUpdatedAt: Date.now(),
        },
    };
    const payload = JSON.stringify(next);

    // 3) Lua atomically: giữ nguyên TTL (dựa trên PTTL), nếu không có TTL thì SET
    const LUA_SET_KEEP_TTL = `
        local k = KEYS[1]
        local v = ARGV[1]
        local ttl = redis.call('PTTL', k)
        if ttl == -2 then
        return 0            -- không còn key (race)
        end
        if ttl > 0 then
        local sec = math.floor((ttl + 999) / 1000)  -- ceil ms -> s
        if sec < 1 then sec = 1 end
        redis.call('SETEX', k, sec, v)
        else
        redis.call('SET', k, v)
        end
        return 1
    `;

    try {
        const r = await redis.eval(LUA_SET_KEEP_TTL, [hKey], [payload]);
        return { exists: r === 1, updated: r === 1, hold: next };
    } catch (e) {
        // 4) Fallback: PTTL + setRaw (không jitter), vẫn giữ TTL gần như chính xác
        try {
            const ttlMs = await redis.pttl(hKey); // -2: no key, -1: no expire, >=0 ms left
            if (ttlMs === -2) return { exists: false }; // race: key vừa expired

            if (ttlMs > 0) {
                const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
                await redis.setRaw(hKey, payload, { ttl: ttlSec });
            } else {
                await redis.setRaw(hKey, payload, { ttl: 0 }); // giữ no-expire
            }
            return { exists: true, updated: true, hold: next, fallback: true };
        } catch (e2) {
            return {
                exists: true,
                updated: false,
                error: e2?.message,
                hold: curr,
            };
        }
    }
}
