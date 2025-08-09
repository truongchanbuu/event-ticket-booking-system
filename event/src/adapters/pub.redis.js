export function createRedisSubscriber({ redisClient, logger = console }) {
    const sub = redisClient.duplicate();
    sub.on("error", (e) => logger.error("[RedisSub] error", e));
    return {
        async connect() {
            await sub.connect?.();
        },
        async psubscribe(pattern, handler) {
            await sub.pSubscribe(pattern, (message, channel) =>
                handler(channel, message),
            );
        },
        async subscribe(channel, handler) {
            await sub.subscribe(channel, (message, ch) => handler(ch, message));
        },
    };
}
