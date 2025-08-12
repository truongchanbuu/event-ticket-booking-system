export async function updateHoldMetaKeepTtl(redis, reservationId, patch) {
    const hKey = `hold:${reservationId}`;
    const raw = await redis.get(hKey);
    if (!raw) return { exists: false };
    const hold = JSON.parse(raw);

    hold.payment = {
        ...(hold.payment || {}),
        ...patch,
        lastUpdatedAt: Date.now(),
    };

    // Giữ nguyên TTL: ưu tiên KEEPTTL; nếu client không hỗ trợ, fallback setex với TTL còn lại
    try {
        await redis.set(hKey, JSON.stringify(hold), "KEEPTTL");
    } catch {
        const ttlMs = await redis.pttl(hKey);
        const ttlSec = Math.max(1, Math.ceil((ttlMs || 1) / 1000));
        await redis.setex(hKey, ttlSec, JSON.stringify(hold));
    }
    return { exists: true, hold };
}

export function ttlRemainingMs(hold) {
    return Math.max(0, Number(hold.expiresAt || 0) - Date.now());
}
