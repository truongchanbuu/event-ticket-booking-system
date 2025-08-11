/**
 * Chia capacity thành m shard:
 * base = floor(capacity/m), r = capacity % m
 * r shard đầu nhận +1. Tổng luôn == capacity.
 */
export function allocateShards(capacity, m) {
    const cap = Number(capacity);
    const shards = Number(m);

    if (!Number.isFinite(cap) || cap < 0) {
        throw new Error(`[inventory.sharding] capacity invalid: ${capacity}`);
    }
    if (!Number.isInteger(shards) || shards <= 0) {
        throw new Error(
            `[inventory.sharding] shardCount must be > 0, got: ${m}`,
        );
    }

    const base = Math.floor(cap / shards);
    const r = cap % shards;

    const allocs = Array.from(
        { length: shards },
        (_, i) => base + (i < r ? 1 : 0),
    );

    const sum = allocs.reduce((a, b) => a + b, 0);
    if (sum !== cap) {
        throw new Error(
            `[inventory.sharding] allocation mismatch: expected ${cap}, got ${sum}`,
        );
    }
    return allocs;
}

/**
 * Hash chọn shard ổn định.
 * Có thể thay bằng fnv1a/xxhash nếu muốn.
 */
export function pickShardIndex(key, shardCount) {
    const s = String(key ?? "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return h % shardCount;
}
