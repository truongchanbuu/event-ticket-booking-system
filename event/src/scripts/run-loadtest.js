#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

import {
    createRedisClient,
    RedisService,
} from "@event_ticket_booking_system/shared";
import config from "../config/index.js";
import { InventoryService } from "../services/inventory.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Business/env ----------
const eventId = process.env.EV_ID || "EV_DEMO";
const ttId = process.env.TT_ID || "TT_DEMO";
const capacity = Number(process.env.CAP || "60000");
const shardCount = Number(process.env.SC || "64");
const holdTtlSec = Number(process.env.HOLD_TTL_SEC || "180");

// Base cho 2 luồng: reserve & availability
let RESERVE_BASE = process.env.RESERVE_BASE || "http://localhost:3006";
let AVAIL_BASE = process.env.AVAIL_BASE || "http://localhost:3002";
const RESERVE_PATH = process.env.RESERVE_PATH || "/api/checkout/reservations";
const AVAIL_PATH = process.env.AVAIL_PATH || "/api/availability";

// k6 options
const K6_FILE =
    process.env.K6_FILE ||
    path.resolve(
        process.cwd(),
        "event/src/scripts/tests/k6-reserve-availability.js",
    );

const START_RATE = process.env.START_RATE || "200";
const PRE_VUS = process.env.PRE_VUS || "500";
const MAX_VUS = process.env.MAX_VUS || "4000";
const T1 = process.env.T1 || "500";
const D1 = process.env.D1 || "30s";
const T2 = process.env.T2 || "1000";
const D2 = process.env.D2 || "60s";
const D3 = process.env.D3 || "10s";
const QTY = process.env.QTY || "1";
const MIX_RESERVE = process.env.MIX_RESERVE || "0.8";

// Runner mode: mặc định chạy LOCAL
const USE_LOCAL_K6 = process.env.USE_LOCAL_K6 !== "false";

// DEV ONLY: đảm bảo sum(shards)==capacity sau seed
const FORCE_RESEED = process.env.FORCE_RESEED !== "false";

function logSection(title) {
    console.log(`\n=== ${title} ===`);
}
function logConfig() {
    console.log(
        "[CONFIG]",
        JSON.stringify(
            {
                eventId,
                ttId,
                capacity,
                shardCount,
                holdTtlSec,
                RESERVE_BASE,
                AVAIL_BASE,
                RESERVE_PATH,
                AVAIL_PATH,
                K6_FILE,
                START_RATE,
                PRE_VUS,
                MAX_VUS,
                T1,
                D1,
                T2,
                D2,
                D3,
                QTY,
                MIX_RESERVE,
                runner: USE_LOCAL_K6 ? "local" : "docker",
                FORCE_RESEED,
                platform: process.platform,
            },
            null,
            2,
        ),
    );
}
function ensureK6FileExists() {
    if (!fs.existsSync(K6_FILE)) {
        console.error("K6_FILE not found:", K6_FILE);
        process.exit(2);
    }
}

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
async function seedInventory(inv) {
    logSection(
        `Seeding inventory tt=${ttId} cap=${capacity} shards=${shardCount}`,
    );
    await inv.seedSharded(ttId, capacity, shardCount, {
        ttlSec: 7 * 24 * 3600,
    });
}
async function forceReseedShards(raw) {
    console.warn("[FORCE_RESEED] Overwriting all shard counters (dev only)...");
    const per = Math.floor(capacity / shardCount);
    const rem = capacity % shardCount;
    const pipe =
        typeof raw.pipeline === "function" ? raw.pipeline() : raw.multi();
    for (let i = 0; i < shardCount; i++) {
        const v = per + (i < rem ? 1 : 0);
        pipe.set(`inv:{${ttId}}:shard:${i}:remaining`, v);
    }
    await pipe.exec();
}
async function healShardsIfNeeded(raw) {
    let sum = 0;
    for (let i = 0; i < shardCount; i++) {
        sum += Number(
            (await raw.get(`inv:{${ttId}}:shard:${i}:remaining`)) || 0,
        );
    }
    if (sum === capacity) return;
    console.warn(
        `[HEAL] sum(shards)=${sum} != capacity=${capacity} → backfill shards`,
    );
    const per = Math.floor(capacity / shardCount);
    const rem = capacity % shardCount;
    const pipe =
        typeof raw.pipeline === "function" ? raw.pipeline() : raw.multi();
    for (let i = 0; i < shardCount; i++) {
        const v = per + (i < rem ? 1 : 0);
        pipe.set(`inv:{${ttId}}:shard:${i}:remaining`, v);
    }
    await pipe.exec();
}
async function debugReadSomeShards(raw, label) {
    const keys = Array.from(
        { length: 5 },
        (_, i) => `inv:{${ttId}}:shard:${i}:remaining`,
    );
    const vals = await Promise.all(keys.map((k) => raw.get(k)));
    console.log(
        `[DEBUG ${label}] first-5 shards:`,
        keys.map((k, i) => ({ k, v: Number(vals[i] || 0) })),
    );
    let quickSum = 0;
    for (let i = 0; i < shardCount; i++) {
        quickSum += Number(
            (await raw.get(`inv:{${ttId}}:shard:${i}:remaining`)) || 0,
        );
    }
    console.log(
        `[DEBUG ${label}] sum(all shards)=`,
        quickSum,
        "expected=",
        capacity,
    );
}
async function readRemainingRaw(raw) {
    let sum = 0;
    for (let i = 0; i < shardCount; i++) {
        sum += Number(
            (await raw.get(`inv:{${ttId}}:shard:${i}:remaining`)) || 0,
        );
    }
    const invVersion = Number(
        (await raw.hget?.(`inv:{${ttId}}:meta`, "invVersion")) ?? 0,
    );
    return { remaining: sum, invVersion };
}

// ---------- k6 ----------
function buildK6EnvArgs({ forDocker = false, isLinux = false } = {}) {
    let reserveBase = RESERVE_BASE;
    let availBase = AVAIL_BASE;
    const usingDefaultReserve =
        !process.env.RESERVE_BASE &&
        RESERVE_BASE.startsWith("http://localhost:");
    const usingDefaultAvail =
        !process.env.AVAIL_BASE && AVAIL_BASE.startsWith("http://localhost:");
    if (forDocker && !isLinux) {
        if (usingDefaultReserve)
            reserveBase = RESERVE_BASE.replace(
                "http://localhost:",
                "http://host.docker.internal:",
            );
        if (usingDefaultAvail)
            availBase = AVAIL_BASE.replace(
                "http://localhost:",
                "http://host.docker.internal:",
            );
    }
    const envs = {
        RESERVE_BASE: reserveBase,
        AVAIL_BASE: availBase,
        RESERVE_PATH,
        AVAIL_PATH,
        EVENT_ID: eventId,
        TT_ID: ttId,
        QTY,
        MIX_RESERVE,
        START_RATE,
        PRE_VUS,
        MAX_VUS,
        T1,
        D1,
        T2,
        D2,
        D3,
    };
    return Object.entries(envs).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
}
async function runK6Once() {
    logSection("Running k6 load test");
    const isLinux = process.platform === "linux";
    const forDocker = !USE_LOCAL_K6;
    const envArgs = buildK6EnvArgs({ forDocker, isLinux });

    let cmd, cmdArgs;
    if (!USE_LOCAL_K6) {
        const hostDir = path.dirname(K6_FILE);
        const fileName = path.basename(K6_FILE);
        const mountPoint = "/work";
        const k6PathInContainer = `${mountPoint}/${fileName}`;
        const args = ["run", "-q", ...envArgs, k6PathInContainer];
        cmd = "docker";
        cmdArgs = [
            "run",
            "--rm",
            "-v",
            `${hostDir}:${mountPoint}`,
            "-w",
            mountPoint,
            ...(isLinux ? ["--network", "host"] : []),
            "grafana/k6:0.49.0",
            ...args,
        ];
    } else {
        const args = ["run", "-q", ...envArgs, K6_FILE];
        cmd = "k6";
        cmdArgs = args;
    }
    console.log("$", cmd, cmdArgs.join(" "));
    return await new Promise((resolve) => {
        const p = spawn(cmd, cmdArgs, { stdio: "inherit" });
        p.on("close", (c) => resolve(c));
    });
}

// ---------- Main ----------
(async () => {
    ensureK6FileExists();
    logConfig();

    const { adapter, raw, redis } = await makeRedis();
    const inv = new InventoryService({ redisService: redis, logger: console });

    try {
        await seedInventory(inv);
        if (FORCE_RESEED) await forceReseedShards(raw);
        else await healShardsIfNeeded(raw);
        await debugReadSomeShards(raw, "AFTER_RESEED");

        const before = await readRemainingRaw(raw);
        console.log("Remaining BEFORE:", before);
        if (before.remaining !== capacity) {
            console.error(
                `[PRECHECK] sum(shards)=${before.remaining} != capacity=${capacity}.`,
            );
            try {
                await redis.quit?.();
            } catch {}
            try {
                await (raw.quit?.() || raw.disconnect?.());
            } catch {}
            process.exit(1);
        }

        const k6Code = await runK6Once();

        const after = await readRemainingRaw(raw);
        console.log("Remaining AFTER:", after);

        const sold = before.remaining - after.remaining;
        const oversell =
            after.remaining < 0 ||
            after.remaining > capacity ||
            sold > capacity ||
            sold < 0 ||
            before.remaining > capacity;

        const passK6 = k6Code === 0;
        const passNoOversell =
            !oversell &&
            after.remaining >= 0 &&
            after.remaining <= capacity &&
            sold >= 0 &&
            sold <= capacity;

        console.log("\n=== SUMMARY ===");
        console.log("k6 thresholds:", passK6 ? "PASS" : "FAIL");
        console.log("no-oversell   :", passNoOversell ? "PASS" : "FAIL");
        console.log("capacity      :", capacity);
        console.log("sold (delta)  :", sold);
        console.log("remaining     :", after.remaining);

        if (passK6 && passNoOversell) {
            console.log(
                "\n✅ DEV LOADTEST PASSED — sẵn sàng move lên staging.",
            );
            try {
                await redis.quit?.();
            } catch {}
            try {
                await (raw.quit?.() || raw.disconnect?.());
            } catch {}
            process.exit(0);
        } else {
            console.error(
                "\n❌ DEV LOADTEST FAILED — vui lòng xem lại k6/oversell/latency.",
            );
            try {
                await redis.quit?.();
            } catch {}
            try {
                await (raw.quit?.() || raw.disconnect?.());
            } catch {}
            process.exit(1);
        }
    } catch (err) {
        console.error("Runner error:", err?.message || err);
        try {
            await redis.quit?.();
        } catch {}
        try {
            await (raw.quit?.() || raw.disconnect?.());
        } catch {}
        process.exit(2);
    }
})();
