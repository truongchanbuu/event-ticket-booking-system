import { config } from "../config/index.js";

const idemKey = (id) => `idem:reservation:${id}`;

export async function getIdemCached(redis, idem) {
    const raw = await redis.get(idemKey(idem));
    return raw ? JSON.parse(raw) : null;
}

export async function setIdemPending(redis, idem) {
    return redis.setNXEx(
        idemKey(idem),
        config.holdTtlSec + config.idemTtlPadSec,
        JSON.stringify({ status: "pending" }),
    );
}

export async function setIdemFinal(redis, idem, statusCode, body) {
    return redis.setex(
        idemKey(idem),
        config.holdTtlSec + config.idemTtlPadSec,
        JSON.stringify({ status: "done", statusCode, body }),
    );
}
