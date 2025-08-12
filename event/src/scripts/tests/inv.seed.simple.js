// scripts/inv.seed.simple.js
import { createRedisClient } from "@event_ticket_booking_system/shared";
import config from "../../config/index.js";
import { metaKey, shardKey } from "../../inventory/key.js";

const ttId = process.argv[2] || "TT_TEST";
const capacity = Number(process.argv[3] || 100);
const m = Number(process.argv[4] || 16);

function alloc(cap, m) {
    const base = Math.floor(cap / m),
        rem = cap % m;
    return Array.from({ length: m }, (_, i) => base + (i === m - 1 ? rem : 0));
}

(async () => {
    const logger = console;
    const r = createRedisClient({ config: { redis: config.redis }, logger });
    await r.connect();

    const meta = metaKey(ttId, { hashTag: true }); // => inv:{TT}:meta
    const parts = alloc(capacity, m);

    // set shards
    for (let i = 0; i < m; i++) {
        const k = shardKey(ttId, i, { hashTag: true }); // => inv:{TT}:shard:i:remaining
        await r.setex(k, 7 * 24 * 3600, String(parts[i])); // TTL 7 ngày cho dev; đổi nếu muốn
    }

    // set meta
    await r.hset(
        meta,
        "capacity",
        String(capacity),
        "shardCount",
        String(m),
        "invVersion",
        "0",
    );

    // verify
    let sum = 0;
    for (let i = 0; i < m; i++) {
        const v = await r.get(shardKey(ttId, i, { hashTag: true }));
        sum += Number(v || 0);
    }
    const metaObj = await r.hgetall(meta);
    logger.info("[SEED.SIMPLE.VERIFY]", { metaObj, sum });

    await r.quit();
})();
