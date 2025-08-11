// scripts/tests/inv.pipeline.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRedisService } from "./inv.redis-wrapper.js";
import { InventoryService } from "../../../src/services/inventory.service.js";
import { shardKey, metaKey, versionKey } from "../../inventory/key.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- cấu hình bằng ENV (có default) ----
const eventId = process.env.EV_ID || "EV_PIPE";
const ttId = process.env.TT_ID || "TT_PIPE";
const capacity = Number(process.env.CAP || 500);
const shardCount = Number(process.env.SC || 16);
const users = Number(process.env.USERS || 1000);
const qtyEach = Number(process.env.QTY || 1);
const batchSize = Number(process.env.BATCH || 200);
const outDir = process.env.OUT_DIR || path.resolve(__dirname, "out");
const writeHolds =
    String(process.env.WRITE_HOLDS || "true").toLowerCase() !== "false";

function rndHint() {
    return "u" + Math.floor(Math.random() * 1e9);
}

async function sumShards(redis, inv, ttId) {
    const m = await redis.hgetall(metaKey(ttId));
    const sc = Number(m?.shardCount || m?.sc || 0);
    let sum = 0;
    for (let i = 0; i < sc; i++) {
        sum += Number((await redis.get(shardKey(ttId, i))) || 0);
    }
    return { sc, sum, cap: Number(m?.capacity || 0) || capacity };
}

(async () => {
    const redis = await createRedisService();
    const inv = new InventoryService({ redisService: redis, logger: console });

    console.log(
        `[PIPE] 1) SEED  ttId=${ttId} cap=${capacity} sc=${shardCount}`,
    );
    await inv.seedSharded(ttId, capacity, shardCount);

    // verify sau seed
    let { sum: sum0 } = await sumShards(redis, inv, ttId);
    if (sum0 !== capacity) {
        console.warn(`[PIPE] After seed: sum=${sum0} expected=${capacity}`);
    } else {
        console.log(`[PIPE] After seed OK: sum=${sum0}`);
    }

    console.log(`[PIPE] 2) STRESS  users=${users} qtyEach=${qtyEach}`);
    const holds = [];
    let ok = 0,
        fail = 0;
    const tStress0 = Date.now();
    await Promise.allSettled(
        Array.from({ length: users }).map(async () => {
            const r = await inv.reserve(ttId, qtyEach, {
                eventId,
                slug: "pipe",
                affinityKey: rndHint(),
            });
            if (r.ok) {
                ok++;
                holds.push({ shardIndex: r.shardIndex, qty: qtyEach });
            } else fail++;
        }),
    );
    const tStress = Date.now() - tStress0;
    console.log(`[PIPE] STRESS done: ok=${ok} fail=${fail} dur=${tStress}ms`);

    // verify sau stress
    let { sum: sumAfterStress } = await sumShards(redis, inv, ttId);
    const expectAfterStress = capacity - ok;
    if (sumAfterStress !== expectAfterStress) {
        console.warn(
            `[PIPE] After stress: sum=${sumAfterStress} expected=${expectAfterStress}`,
        );
    } else {
        console.log(`[PIPE] After stress OK: sum=${sumAfterStress}`);
    }

    // ghi holds (tùy chọn)
    if (writeHolds) {
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(
            outDir,
            `holds-${eventId}-${ttId}-${Date.now()}.json`,
        );
        fs.writeFileSync(
            outFile,
            JSON.stringify(
                {
                    eventId,
                    ttId,
                    holds,
                    meta: { capacity, shardCount, users, qtyEach },
                },
                null,
                2,
            ),
        );
        console.log(`[PIPE] Holds saved: ${outFile} (count=${holds.length})`);
    }

    console.log(`[PIPE] 3) RELEASE in batches of ${batchSize}`);
    const tRel0 = Date.now();
    for (let i = 0; i < holds.length; i += batchSize) {
        const batch = holds.slice(i, i + batchSize);
        await Promise.allSettled(
            batch.map((h) =>
                inv.release(ttId, h.qty, {
                    eventId,
                    slug: "pipe",
                    shardIndex: h.shardIndex,
                }),
            ),
        );
    }
    const tRel = Date.now() - tRel0;
    console.log(`[PIPE] RELEASE done in ${tRel}ms`);

    // verify cuối
    const { sum: sumFinal, cap } = await sumShards(redis, inv, ttId);
    const ver = Number((await redis.get(versionKey(eventId))) || 0);
    console.log(
        `[PIPE] 4) VERIFY { capacity=${cap}, sumShards=${sumFinal}, invVersion=${ver} }`,
    );
    if (sumFinal === cap) console.log("[PIPE] ✅ OK: sumShards == capacity");
    else console.warn("[PIPE] ⚠️  WARN: sumShards != capacity");

    await redis.quit();
    process.exit(0);
})().catch(async (e) => {
    console.error("[PIPE] ERROR", e);
    process.exit(1);
});
