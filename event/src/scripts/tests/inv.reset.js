import { createRedisClient } from "@event_ticket_booking_system/shared";
import config from "../../config/index.js";

const ttId = process.argv[2] || "TT_TEST";

(async () => {
    const logger = console;
    const r = createRedisClient({ config: { redis: config.redis }, logger });
    await r.connect();

    // quét và xoá tất cả key liên quan TT (có/không hash-tag)
    const patterns = [`inv:{${ttId}}:*`, `inv:${ttId}:*`];

    for (const p of patterns) {
        let cursor = "0";
        do {
            const [next, keys] = await r.scan(cursor, "MATCH", p, "COUNT", 200);
            cursor = next;
            if (keys?.length) await r.del(...keys);
        } while (cursor !== "0");
    }

    logger.info("[RESET DONE]");
    await r.quit();
})();
