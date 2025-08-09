export function createRedisPubSub({ redisClient, logger = console }) {
    const sub =
        typeof redisClient.duplicate === "function"
            ? redisClient.duplicate()
            : redisClient;

    sub.on?.("error", (e) => logger.error("[RedisSub] error", e));
    sub.on?.("ready", () => logger.info("[RedisSub] ready"));

    async function connect() {
        // node-redis v4 có connect(), ioredis tự connect (trừ khi lazyConnect)
        if (typeof sub.connect === "function") {
            await sub.connect();
        } else if (sub.status === "wait" && typeof sub.connect === "function") {
            // ioredis lazyConnect=true
            await sub.connect();
        }
    }

    // Pattern subscribe cho cả ioredis & node-redis v4
    async function psubscribe(pattern, handler) {
        if (typeof sub.pSubscribe === "function") {
            // node-redis v4: pSubscribe(pattern, (message, channel)=>{})
            await sub.pSubscribe(pattern, (message, channel) =>
                handler({ channel, message }),
            );
            return;
        }
        if (typeof sub.psubscribe === "function") {
            // ioredis: psubscribe(pattern, (message, channel)=>{})
            await sub.psubscribe(pattern, (message, channel) =>
                handler({ channel, message }),
            );
            return;
        }
        throw new Error("Redis client does not support psubscribe/pSubscribe");
    }

    // Channel subscribe (không pattern) cho cả hai
    async function subscribe(channel, handler) {
        if (
            typeof sub.subscribe === "function" &&
            sub.options?.modules == null
        ) {
            // ioredis: subscribe(channel, (message, ch)=>{})
            await sub.subscribe(channel, (message, ch) =>
                handler({ channel: ch, message }),
            );
            return;
        }
        if (typeof sub.subscribe === "function") {
            // node-redis v4: subscribe(channel, (message)=>{})
            await sub.subscribe(channel, (message) =>
                handler({ channel, message }),
            );
            return;
        }
        throw new Error("Redis client does not support subscribe()");
    }

    // Publisher: dùng client chính (không phải sub)
    async function publish(channel, message) {
        if (typeof redisClient.publish !== "function") {
            throw new Error("Redis client does not support publish()");
        }
        return redisClient.publish(channel, message);
    }

    return { connect, psubscribe, subscribe, publish };
}
