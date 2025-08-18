// utils/payment-intent.idem.js
// Idempotency riêng cho payment-intent, KHÔNG đụng vào reservation.
// Dùng 2 pha: pending -> done. TTL mặc định dựa theo intent TTL.

const KEY_PREFIX = "idem:payment_intent";

const keyOf = (id) => `${KEY_PREFIX}:${id}`;

export async function getIntentIdemCached(redisService, idem) {
    const raw = await redisService.get(keyOf(idem));
    return raw ? JSON.parse(raw) : null;
}

/**
 * Đặt trạng thái pending (latch) với TTL.
 * Trả "OK" nếu đặt được, "EXISTS" nếu đã tồn tại.
 */
export async function setIntentIdemPending(
    redisService,
    idem,
    {
        ttlBaseSec = 180, // ví dụ 3 phút
        ttlPadSec = 60,
    } = {},
) {
    const ttl = ttlBaseSec + ttlPadSec;
    if (ttl <= 0) throw new Error("TTL must be positive");
    // redisService API giống reservation: setNXEx(key, value, ttl, { jitter })
    const ok = await redisService.setNXEx(
        keyOf(idem),
        { status: "pending" },
        ttl,
        { jitter: false },
    );
    return ok ? "OK" : "EXISTS";
}

/**
 * Lưu kết quả cuối (done) cùng TTL.
 */
export async function setIntentIdemFinal(
    redisService,
    idem,
    statusCode,
    body,
    { ttlBaseSec = 180, ttlPadSec = 60 } = {},
) {
    const ttl = ttlBaseSec + ttlPadSec;
    if (ttl <= 0) throw new Error("TTL must be positive");
    // redisService.set(key, value, { ttl })
    return redisService.set(
        keyOf(idem),
        { status: "done", statusCode, body },
        { ttl },
    );
}
