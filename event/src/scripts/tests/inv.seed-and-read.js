import path from "path";
import { fileURLToPath } from "url";
import { InventoryService } from "../../services/inventory.service.js";
import {
    createRedisClient,
    RedisService,
} from "@event_ticket_booking_system/shared";
import config from "../../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventId = process.env.EV_ID || "EV_DEMO";
const ttId = process.env.TT_ID || "TT_DEMO";
const capacity = Number(process.env.CAP || "200000");
const shardCount = Number(process.env.SC || "64");

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
    await inv.seedSharded(ttId, capacity, shardCount, {
        ttlSec: 7 * 24 * 3600,
        eventId,
    });

    const { remains, invVersion } = await inv.readAggregatedCountersWithVersion(
        eventId,
        [ttId],
    );

    console.log("[SEED DONE]", { ttId, capacity, shardCount });
    console.log("[READ]", { totalRemaining: remains[0], invVersion });

    await redis.quit();
    process.exit(0);
})();
