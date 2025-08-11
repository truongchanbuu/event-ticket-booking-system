// scripts/tests/inv.verify.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { InventoryService } from "../../services/inventory.service.js";
import { createRedisService } from "./inv.redis-wrapper.js";
import { shardKey, metaKey, versionKey } from "../../inventory/key.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventId = process.env.EV_ID || "EV_S";
const ttId = process.env.TT_ID || "TT_S";

(async () => {
    const redis = await createRedisService();
    const inv = new InventoryService({ redisService: redis, logger: console });

    // lấy shard count từ meta
    const mKey = metaKey(ttId);
    const meta = await redis.hgetall(mKey);
    const sc = Number(meta?.shardCount || meta?.sc || 0);
    const capacity = Number(meta?.capacity || 0);

    if (!sc) {
        console.error("[VERIFY] missing shardCount in meta", meta);
        process.exit(1);
    }

    // sum shards & check âm
    let sum = 0,
        negatives = [];
    for (let i = 0; i < sc; i++) {
        const v = Number((await redis.get(shardKey(ttId, i))) || 0);
        sum += v;
        if (v < 0) negatives.push({ i, v });
    }

    const ver = Number((await redis.get(versionKey(eventId))) || 0);

    console.log("[VERIFY RESULT]", {
        eventId,
        ttId,
        shardCount: sc,
        capacity,
        sumShards: sum,
        invVersion: ver,
        negatives: negatives.length ? negatives : "none",
    });

    if (capacity) {
        if (sum === capacity) console.log("[OK] sumShards == capacity");
        else
            console.warn(`[WARN] sumShards (${sum}) != capacity (${capacity})`);
    }

    await redis.quit();
    process.exit(0);
})();
