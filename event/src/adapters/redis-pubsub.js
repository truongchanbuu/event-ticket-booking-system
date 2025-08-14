export function createRedisPubSub({ redisClient, logger = console }) {
    // Luôn dùng 1 connection riêng cho SUB
    const sub =
        typeof redisClient.duplicate === "function"
            ? redisClient.duplicate()
            : redisClient;

    sub.on?.("error", (e) => logger.error("[RedisSub] error", e));
    sub.on?.("ready", () => logger.info("[RedisSub] ready"));

    async function connect() {
        // node-redis v4 cần connect(); ioredis thường auto-connect (trừ lazyConnect)
        if (typeof sub.connect === "function") {
            if (
                sub.status === "wait" ||
                sub.status === "end" ||
                sub.status === "connecting"
            ) {
                await sub.connect().catch(() => {}); // node-redis
            } else {
                await sub.connect().catch(() => {}); // ioredis lazyConnect
            }
        }
    }

    // Pattern subscribe (pSubscribe)
    async function psubscribe(pattern, handler) {
        // node-redis v4 có pSubscribe(pattern, (message, channel)=>{})
        if (typeof sub.pSubscribe === "function") {
            await sub.pSubscribe(pattern, (message, channel) => {
                handler({ channel, message });
            });
            return;
        }

        // ioredis: cần psubscribe rồi nghe 'pmessage'
        if (
            typeof sub.psubscribe === "function" &&
            typeof sub.on === "function"
        ) {
            // Đăng ký listener 1 lần (idempotent)
            if (!sub.__hasPmessageHook) {
                sub.on("pmessage", (_pattern, channel, message) => {
                    handler({ channel, message });
                });
                sub.__hasPmessageHook = true;
            }
            await sub.psubscribe(pattern);
            return;
        }

        throw new Error("Client does not support pattern subscribe");
    }

    // Channel subscribe (không pattern)
    async function subscribe(channel, handler) {
        // node-redis v4: subscribe(channel, (message)=>{})
        if (typeof sub.subscribe === "function" && !sub.on) {
            await sub.subscribe(channel, (message) =>
                handler({ channel, message }),
            );
            return;
        }

        // ioredis: subscribe rồi nghe 'message'
        if (
            typeof sub.subscribe === "function" &&
            typeof sub.on === "function"
        ) {
            if (!sub.__hasMessageHook) {
                sub.on("message", (ch, message) =>
                    handler({ channel: ch, message }),
                );
                sub.__hasMessageHook = true;
            }
            await sub.subscribe(channel);
            return;
        }

        throw new Error("Client does not support subscribe");
    }

    // Publisher: dùng client chính (không phải 'sub')
    async function publish(channel, message) {
        if (typeof redisClient.publish !== "function") {
            throw new Error("Redis client lacks publish()");
        }
        return redisClient.publish(channel, message);
    }

    return { connect, psubscribe, subscribe, publish };
}
