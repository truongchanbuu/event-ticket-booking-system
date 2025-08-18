import { config } from "../config/index.js";

const idemKey = (id) => `idem:reservation:${id}`;

export async function getIdemCached(redis, idem) {
    const raw = await redis.get(idemKey(idem));
    return raw ? JSON.parse(raw) : null;
}

export async function setIdemPending(redis, idem) {
    const holdTtlSec = Number(config.holdTtlSec) || 300;
    const idemTtlPadSec = Number(config.idemTtlPadSec) || 60;
    const ttl = holdTtlSec + idemTtlPadSec;

    if (ttl <= 0) throw new Error("TTL must be positive");

    const ok = await redis.setNXEx(idemKey(idem), { status: "pending" }, ttl, {
        jitter: false,
    });
    return ok ? "OK" : "EXISTS";
}

export async function setIdemFinal(redis, idem, statusCode, body) {
    const holdTtlSec = Number(config.holdTtlSec) || 20;
    const idemTtlPadSec = Number(config.idemTtlPadSec) || 5;
    const ttl = holdTtlSec + idemTtlPadSec;

    if (ttl <= 0) throw new Error("TTL must be positive");

    return redis.set(
        idemKey(idem),
        { status: "done", statusCode, body },
        { ttl },
    );
}
