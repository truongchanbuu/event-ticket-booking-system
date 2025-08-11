// ESM
import IORedis from "ioredis";

export async function createRedisService() {
    const client = new IORedis(
        process.env.REDIS_URL || "redis://127.0.0.1:6379",
        {
            lazyConnect: false,
            maxRetriesPerRequest: 2,
        },
    );

    const svc = {
        // --- basic gets/sets ---
        async get(k) {
            return client.get(k);
        },
        async del(k) {
            return client.del(k);
        },
        async incr(k) {
            return client.incr(k);
        },
        async hgetall(k) {
            return client.hgetall(k);
        },
        async publish(ch, msg) {
            return client.publish(ch, msg);
        },
        // for readAggregatedCountersWithVersion fallback
        async mgetRaw(keys) {
            return client.mget(keys);
        },

        // --- pipeline (InventoryService sẽ detect và dùng) ---
        pipeline() {
            return client.pipeline();
        },

        // --- Lua helpers khớp chữ ký wrapper của bạn ---
        async scriptLoad(script) {
            return client.script("load", script);
        },
        async evalsha(sha, keys = [], argv = []) {
            const numKeys = Array.isArray(keys) ? keys.length : 0;
            // ioredis.evalsha expects (...args) -> [sha, numKeys, ...keys, ...argv]
            return client.evalsha(sha, numKeys, ...keys, ...argv);
        },

        // optional: close
        async quit() {
            try {
                await client.quit();
            } catch {}
        },
    };

    // log lỗi để dễ thấy
    client.on("error", (e) => console.error("[redis:error]", e?.message || e));

    return svc;
}
