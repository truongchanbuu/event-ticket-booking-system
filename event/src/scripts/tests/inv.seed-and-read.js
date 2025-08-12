import path from "path";
import { fileURLToPath } from "url";
import { createRedisService } from "./inv.redis-wrapper.js";
import { InventoryService } from "../../services/inventory.service.js";
import {
    createRedisClient,
    RedisService,
} from "@event_ticket_booking_system/shared";
import config from "../../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventId = process.env.EV_ID || "EV_TEST";
const ttId = process.env.TT_ID || "TT_TEST";
const capacity = Number(process.env.CAP || 100);
const shardCount = Number(process.env.SC || 16);

(async () => {
    const redisClient = createRedisClient({
        config: config,
        logger: console,
    });
    const redis = new RedisService({
        redisClient,
        config: config,
        logger: console,
    });

    const inv = new InventoryService({ redisService: redis, logger: console });
    await inv.seedSharded(ttId, capacity, shardCount);

    const { remains, invVersion } = await inv.readAggregatedCountersWithVersion(
        eventId,
        [ttId],
    );

    console.log("[SEED DONE]", { ttId, capacity, shardCount });
    console.log("[READ]", { totalRemaining: remains[0], invVersion });

    await redis.quit();
    process.exit(0);
})();
