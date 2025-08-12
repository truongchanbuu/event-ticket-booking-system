import fs from "fs";
import path from "path";
import { Redis } from "ioredis";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const lua = fs.readFileSync(
    path.resolve(__dirname, "../../inventory/lua/seed.lua"),
    "utf8",
);

const metaKey = (tt) => `inv:{${tt}}:meta`;
const shardKey = (tt, i) => `inv:{${tt}}:shard:${i}:remaining`;
const alloc = (cap, m) => {
    const base = Math.floor(cap / m),
        rem = cap % m;
    return Array.from({ length: m }, (_, i) => base + (i === m - 1 ? rem : 0));
};

const sumShards = async (r, tt, m) => {
    const keys = Array.from({ length: m }, (_, i) => shardKey(tt, i));
    const vals = await r.mget(keys);
    return (vals || []).reduce((s, v) => s + Number(v || 0), 0);
};

describe("Lua seed inventory", () => {
    let r, sha;
    const TT = "TT_TEST";
    const CAP = 100;
    const M = 16;
    const TTL = 86400; // 1 ngày

    beforeAll(async () => {
        r = new Redis(REDIS_URL, { lazyConnect: false });
        sha = await r.script("load", lua);
    }, 20000);

    beforeEach(async () => {
        await r.flushall();
    });

    afterAll(async () => {
        await r.quit();
    });

    test("fresh seed -> OK and sums match", async () => {
        const keys = [
            metaKey(TT),
            ...Array.from({ length: M }, (_, i) => shardKey(TT, i)),
        ];
        const argv = [
            String(CAP),
            String(M),
            String(TTL),
            "0",
            ...alloc(CAP, M).map(String),
        ];

        const res = await r.evalsha(sha, keys.length, ...keys, ...argv);
        expect(res).toBe("OK");

        const meta = await r.hgetall(metaKey(TT));
        expect(meta.capacity).toBe(String(CAP));
        expect(meta.shardCount).toBe(String(M));

        const s = await sumShards(r, TT, M);
        expect(s).toBe(CAP);
    });

    test("idempotent reseed -> EXISTS, data unchanged", async () => {
        const keys = [
            metaKey(TT),
            ...Array.from({ length: M }, (_, i) => shardKey(TT, i)),
        ];
        const argv = [
            String(CAP),
            String(M),
            String(TTL),
            "0",
            ...alloc(CAP, M).map(String),
        ];

        const res1 = await r.evalsha(sha, keys.length, ...keys, ...argv);
        expect(res1).toBe("OK");

        const res2 = await r.evalsha(sha, keys.length, ...keys, ...argv);
        expect(res2).toBe("EXISTS");

        const s = await sumShards(r, TT, M);
        expect(s).toBe(CAP);
    });

    test("heal missing shards with forceRepair=1", async () => {
        const keys = [
            metaKey(TT),
            ...Array.from({ length: M }, (_, i) => shardKey(TT, i)),
        ];
        const argv = [
            String(CAP),
            String(M),
            String(TTL),
            "0",
            ...alloc(CAP, M).map(String),
        ];
        await r.evalsha(sha, keys.length, ...keys, ...argv);

        // Xoá vài shard để mô phỏng mất dữ liệu
        await r.del(shardKey(TT, 3), shardKey(TT, 8), shardKey(TT, 12));

        const argvRepair = [
            String(CAP),
            String(M),
            String(TTL),
            "1",
            ...alloc(CAP, M).map(String),
        ];
        const res = await r.evalsha(sha, keys.length, ...keys, ...argvRepair);
        expect(String(res)).toMatch(/^REPAIRED:\d+|EXISTS$/); // nếu TTL ngắn có thể vừa tồn tại => EXISTS

        const s = await sumShards(r, TT, M);
        expect(s).toBe(CAP);
    });

    test("mismatch capacity/shardCount -> MISMATCH", async () => {
        const keys = [
            metaKey(TT),
            ...Array.from({ length: M }, (_, i) => shardKey(TT, i)),
        ];
        const argv = [
            String(CAP),
            String(M),
            String(TTL),
            "0",
            ...alloc(CAP, M).map(String),
        ];
        await r.evalsha(sha, keys.length, ...keys, ...argv);

        // Thử reseed với capacity khác
        const argvMismatch = [
            String(CAP + 1),
            String(M),
            String(TTL),
            "0",
            ...alloc(CAP + 1, M).map(String),
        ];
        const res = await r.evalsha(sha, keys.length, ...keys, ...argvMismatch);
        expect(res).toBe("MISMATCH");
    });
});
