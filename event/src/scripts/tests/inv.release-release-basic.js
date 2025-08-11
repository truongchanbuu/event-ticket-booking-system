import path from "path";
import { fileURLToPath } from "url";
import { createRedisService } from "./inv.redis-wrapper.js";
import { InventoryService } from "../../services/inventory.service.js";
import { shardKey } from "../../inventory/key.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventId = process.env.EV_ID || "EV_TEST";
const ttId = process.env.TT_ID || "TT_TEST";
const qty = Number(process.env.QTY || 3);

(async () => {
    const redis = await createRedisService();
    const inv = new InventoryService({ redisService: redis, logger: console });

    // 1) reserve
    const r1 = await inv.reserve(ttId, qty, {
        eventId,
        slug: "slug1",
        affinityKey: "userA",
    });
    console.log("[RESERVE]", r1);

    // 2) nếu ok -> release lại đúng shard
    if (r1.ok) {
        const rel = await inv.release(ttId, qty, {
            eventId,
            slug: "slug1",
            shardIndex: r1.shardIndex,
        });
        console.log("[RELEASE]", rel);
    }

    // 3) đọc tổng & version
    const { remains, invVersion } = await inv.readAggregatedCountersWithVersion(
        eventId,
        [ttId],
    );
    console.log("[AFTER]", { totalRemaining: remains[0], invVersion });

    // 4) kiểm tra shard không âm
    const sc = await inv.getShardCount(ttId);
    for (let i = 0; i < sc; i++) {
        const v = Number((await redis.get(shardKey(ttId, i))) || 0);
        if (v < 0) throw new Error(`NEGATIVE SHARD at ${i}: ${v}`);
    }
    console.log("[CHECK] all shards >= 0");

    await redis.quit();
    process.exit(0);
})();
