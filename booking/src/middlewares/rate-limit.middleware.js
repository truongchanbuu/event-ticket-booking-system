import {
    getClientIdentity,
    rateLimitOncePerWindow,
    rlKeyOncePerWindow,
} from "../libs/rate-limit.js";

export function rlOnce({
    redis,
    routeKey,
    windowSec = 60,
    jitterSec = 3,
    bypassHeader = "X-Demo-Mode",
}) {
    if (!redis) throw new Error("redis required");
    if (!routeKey) throw new Error("routeKey required");

    return async function rlOnceMiddleware(req, res, next) {
        try {
            if (req.get(bypassHeader) === "1") return next();
            const id = getClientIdentity(req);
            const key = rlKeyOncePerWindow(routeKey, id);
            const rl = await rateLimitOncePerWindow(
                redis,
                key,
                windowSec,
                jitterSec,
            );
            if (!rl.allowed) {
                res.set("Retry-After", String(rl.retryAfterSec));
                return res.status(429).json({
                    ok: false,
                    error: "RATE_LIMITED",
                    retryAfterSec: rl.retryAfterSec,
                });
            }
            return next();
        } catch (e) {
            return next();
        }
    };
}
