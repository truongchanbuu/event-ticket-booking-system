import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRedisClient } from "@event_ticket_booking_system/shared";
import { allocateShards } from "../../src/inventory/sharding.js";
import { metaKey, shardKey } from "../../src/inventory/key.js";
import config from "../../src/config/index.js";

const lua = fs.readFileSync(path.resolve("src/inventory/lua/seed.lua"), "utf8");

test("seed.lua – OK → EXISTS → HEAL → MISMATCH", async (t) => {
    const redis = createRedisClient({
        config: config,
    }).raw;
    await redis.flushall();

    const tt = "TT_SEED_01";
    const cap = 101;
    const m = 10;
    const allocs = allocateShards(cap, m);

    const meta = metaKey(tt);
    const keys = [meta, ...allocs.map((_, i) => shardKey(tt, i))];
    const argv = [String(cap), String(m), ...allocs.map(String)];

    const sha = await redis.script("load", lua);

    // Lần 1: OK
    let res = await redis.evalsha(sha, keys.length, ...keys, ...argv);
    assert.equal(res, "OK");

    // Validate tổng
    const shardVals = await redis.mget(keys.slice(1));
    const sum = shardVals.reduce((a, v) => a + Number(v || 0), 0);
    assert.equal(sum, cap);

    // Meta đúng
    const metaMap = await redis.hgetall(meta);
    assert.equal(Number(metaMap.capacity), cap);
    assert.equal(Number(metaMap.shardCount), m);
    assert.equal(Number(metaMap.checksum), cap);

    // Lần 2: EXISTS (idempotent)
    res = await redis.evalsha(sha, keys.length, ...keys, ...argv);
    assert.equal(res, "EXISTS");

    // HEAL: xoá 1 shard rồi seed lại → EXISTS và shard được SETNX lại
    const missing = keys[1 + 3]; // shard index 3
    await redis.del(missing);
    res = await redis.evalsha(sha, keys.length, ...keys, ...argv);
    assert.equal(res, "EXISTS");
    const healed = await redis.get(missing);
    assert.equal(Number(healed), allocs[3]);

    // MISMATCH: đổi capacity
    const argvMismatch = [
        String(cap + 1),
        String(m),
        ...allocateShards(cap + 1, m).map(String),
    ];
    res = await redis.evalsha(sha, keys.length, ...keys, ...argvMismatch);
    assert.equal(res, "MISMATCH");

    await redis.quit();
});
