#!/usr/bin/env node
import { InventoryService } from "../inventory/inventory.service.js";
import { createRedisService } from "../lib/redis-factory.js"; // giả sử bạn có factory
import {
    INVENTORY_SHARD_COUNT,
    REDIS_INV_PREFIX,
} from "../config/inventory-flags.js";

function parseArgs() {
    const args = process.argv.slice(2);
    const out = { shard: INVENTORY_SHARD_COUNT, prefix: REDIS_INV_PREFIX };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--ticketType" || a === "-t") out.ticketType = args[++i];
        else if (a === "--capacity" || a === "-c")
            out.capacity = Number(args[++i] || 0);
        else if (a === "--shard" || a === "-s")
            out.shard = Number(args[++i] || out.shard);
        else if (a === "--prefix" || a === "-p") out.prefix = args[++i];
        else if (a === "--eventId" || a === "-eid") out.prefix = args[++i];
    }
    return out;
}

(async () => {
    const opts = parseArgs();
    if (!opts.ticketType) {
        console.error(
            "Usage: seed-inventory --ticketType <ID> --capacity <N> [--shard 16] [--prefix inv]",
        );
        process.exit(1);
    }
    const redis = createRedisService(); // lấy theo codebase của bạn
    const inv = new InventoryService({ redisService: redis, logger: console });
    try {
        const res = await inv.seedSharded(
            opts.ticketType,
            opts.capacity,
            opts.shard,
            { prefix: opts.prefix, eventId: opts.eventId },
        );
        console.log("[seed-inventory]", {
            ...res,
            ticketTypeId: opts.ticketType,
            prefix: opts.prefix,
        });
        process.exit(0);
    } catch (e) {
        console.error("[seed-inventory] failed:", e.message);
        process.exit(2);
    }
})();
