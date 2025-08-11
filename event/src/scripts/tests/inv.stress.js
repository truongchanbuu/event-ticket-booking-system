import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRedisService } from "./inv.redis-wrapper.js";
import { InventoryService } from "../../services/inventory.service.js";
import { shardKey } from "../../inventory/key.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventId = process.env.EV_ID || "EV_TEST";
const ttId = process.env.TT_ID || "TT_TEST";
const capacity = Number(process.env.CAP || 100);
const shardCount = Number(process.env.SC || 16);
const users = Number(process.env.USERS || 1000);
const qtyEach = Number(process.env.QTY || 1);
const outDir = process.env.OUT_DIR || path.resolve(__dirname, "out");
const outFile = path.join(outDir, `holds-${eventId}-${ttId}.json`);

function rndHint() {
    return "u" + Math.floor(Math.random() * 1e9);
}

(async () => {
    const redis = await createRedisService();
    const inv = new InventoryService({ redisService: redis, logger: console });

    await inv.seedSharded(ttId, capacity, shardCount);

    console.log(
        `[STRESS] start: users=${users}, qtyEach=${qtyEach}, capacity=${capacity}`,
    );

    const holds = []; // lưu các khoản đã reserve thành công
    let ok = 0,
        fail = 0;

    const t0 = Date.now();
    await Promise.allSettled(
        Array.from({ length: users }).map(async () => {
            const r = await inv.reserve(ttId, qtyEach, {
                eventId,
                slug: "s",
                affinityKey: rndHint(),
            });
            if (r.ok) {
                ok++;
                holds.push({ ttId, qty: qtyEach, shardIndex: r.shardIndex });
            } else {
                fail++;
            }
        }),
    );
    const dt = Date.now() - t0;

    // Ghi file holds
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        outFile,
        JSON.stringify(
            {
                eventId,
                ttId,
                holds,
                meta: {
                    users,
                    qtyEach,
                    capacity,
                    durationMs: dt,
                    timestamp: Date.now(),
                },
            },
            null,
            2,
        ),
    );
    console.log(`[STRESS DONE] ok=${ok} fail=${fail} duration=${dt}ms`);
    console.log(`[HOLDS FILE] ${outFile}`);

    // Kiểm tra sum shards và invariant
    const sc = await inv.getShardCount(ttId);
    let sum = 0;
    for (let i = 0; i < sc; i++) {
        sum += Number((await redis.get(shardKey(ttId, i))) || 0);
    }
    if (ok > capacity)
        throw new Error(`Oversell detected: ok=${ok} > capacity=${capacity}`);
    if (sum !== capacity - ok) {
        console.warn(`Sum mismatch: sum=${sum}, expected=${capacity - ok}`);
    } else {
        console.log(`[INVARIANT OK] sum=${sum} == capacity - ok`);
    }

    await redis.quit();
    process.exit(0);
})();
