#!/usr/bin/env node
import config from "../config/index.js";
import {
    createRedisClient,
    RedisService,
} from "@event_ticket_booking_system/shared";
import { InventoryService } from "../services/inventory.service.js";

// ---------- Redis / Inventory ----------
async function makeRedis() {
    const adapter = createRedisClient({ config, logger: console });
    const raw = adapter?.raw ?? adapter; // ioredis client thô
    const redis = new RedisService({
        redisClient: adapter,
        config,
        logger: console,
    });
    console.log("[REDIS INFO]", {
        db: raw?.options?.db,
        keyPrefix: raw?.options?.keyPrefix,
        status: raw?.status,
    });
    return { adapter, raw, redis };
}

function parseArgs() {
    const out = {
        shard: Number(process.env.SHARD_COUNT || 16),
        prefix: process.env.REDIS_INV_PREFIX || "inv",
    };
    // tách dạng --key=value
    const raw = process.argv.slice(2).flatMap((a) => {
        const m = a.match(/^--([^=]+)=(.*)$/);
        return m ? [`--${m[1]}`, m[2]] : [a];
    });
    for (let i = 0; i < raw.length; i++) {
        const a = raw[i];
        if (a === "--ticketType" || a === "--tt" || a === "-t")
            out.ticketType = raw[++i];
        else if (a === "--capacity" || a === "--cap" || a === "-c")
            out.capacity = Number(raw[++i] || 0);
        else if (a === "--shard" || a === "--shards" || a === "-s")
            out.shard = Number(raw[++i] || out.shard);
        else if (a === "--prefix" || a === "-p") out.prefix = raw[++i];
    }
    return out;
}

(async () => {
    const opts = parseArgs();
    if (!opts.ticketType) {
        console.error(
            "Usage: node scripts/seedInventory.js --tt <ID> --cap <N> [--shards 16] [--prefix inv]",
        );
        process.exit(1);
    }
    const { redis } = await makeRedis();
    const inv = new InventoryService({ redisService: redis, logger: console });
    try {
        const r = await inv.seedSharded(
            opts.ticketType,
            opts.capacity,
            opts.shard,
            { prefix: opts.prefix },
        );
        console.log("[SEED DONE]", {
            ...r,
            tt: opts.ticketType,
            prefix: opts.prefix,
        });
        process.exit(0);
    } catch (e) {
        console.error("[SEED FAIL]", e?.message);
        process.exit(2);
    }
})();
