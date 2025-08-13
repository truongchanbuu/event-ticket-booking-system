export function buildOrderStateStore({ redis }) {
    return {
        async get(orderId) {
            const v = await redis.get(`mockpsp:order:${orderId}`);
            return v ? JSON.parse(v) : null;
        },
        async set(orderId, state) {
            await redis.set(
                `mockpsp:order:${orderId}`,
                JSON.stringify(state),
                "EX",
                60 * 60,
            ); // TTL 1h
        },
    };
}
