import test from "node:test";
import assert from "node:assert/strict";
import { createRedisClient } from "@event_ticket_booking_system/shared";
import config from "../../src/config/index.js";
import { InventoryService } from "../../src/services/inventory.service.js";
import { metaKey, shardKey } from "../../src/inventory/key.js";

test("InventoryService.seedSharded – OK/EXISTS/MISMATCH", async () => {
    const redis = createRedisClient({ config: config }).raw;
    await redis.flushall();

    // giả lập redis wrapper tối giản nếu bạn chưa wire đầy đủ
    const redisWrapper = {
        scriptLoad: (s) => redis.script("load", s),
        evalsha: (sha, keys, argv) =>
            redis.evalsha(sha, keys.length, ...keys, ...argv),
        get: (...args) => redis.get(...args),
        mgetRaw: (...args) => redis.mget(...args),
        hgetall: (...args) => redis.hgetall(...args),
    };

    const svc = new InventoryService({
        redisService: redisWrapper,
        logger: console,
        pubsub: {},
    });

    // lần 1
    let r = await svc.seedSharded("TT_A", 50, 5);
    assert.equal(r.status, "OK");

    // lần 2 – same config
    r = await svc.seedSharded("TT_A", 50, 5);
    assert.equal(r.status, "EXISTS");

    // mismatch
    let mismatchErr = null;
    try {
        await svc.seedSharded("TT_A", 60, 5);
    } catch (e) {
        mismatchErr = e;
    }
    assert.ok(mismatchErr && mismatchErr.code === "INVENTORY_SEED_MISMATCH");

    // validate Redis
    const meta = await redis.hgetall(metaKey("TT_A"));
    assert.equal(Number(meta.capacity), 50);
    assert.equal(Number(meta.shardCount), 5);

    const shards = await redis.mget(
        [0, 1, 2, 3, 4].map((i) => shardKey("TT_A", i)),
    );
    const sum = shards.reduce((a, v) => a + Number(v || 0), 0);
    assert.equal(sum, 50);

    await redis.quit();
});
