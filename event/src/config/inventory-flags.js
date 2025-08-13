const toBool = (v, dflt) => {
    if (v == null) return dflt;
    const s = String(v).trim().toLowerCase();
    return ["1", "true", "yes", "y", "on"].includes(s);
};

const toInt = (v, dflt) => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) ? n : dflt;
};

export const INVENTORY_SHARDING_ENABLED = toBool(
    process.env.INVENTORY_SHARDING_ENABLED,
    true,
);

export const INVENTORY_MULTI_PROBE = Math.max(
    0,
    toInt(process.env.INVENTORY_MULTI_PROBE, 0),
);

export const INVENTORY_COMPAT_LEGACY = toBool(
    process.env.INVENTORY_COMPAT_LEGACY,
    true,
);

export const INVENTORY_SHARD_COUNT = (() => {
    const n = toInt(process.env.INVENTORY_SHARD_COUNT, 16);
    if (n < 1) return 1;
    if (n > 128) return 128;
    return n;
})();

export const REDIS_INV_PREFIX = process.env.REDIS_INV_PREFIX || "inv";

export const SHARDCOUNT_CACHE_TTL_MS = Number(
    process.env.INV_SHARDCOUNT_TTL_MS || 5000,
);

export function assertInventoryConfig(logger = console) {
    if (!REDIS_INV_PREFIX) {
        throw new Error("[inventory] REDIS_INV_PREFIX is empty");
    }
    if (INVENTORY_MULTI_PROBE > 3) {
        logger.warn(
            "[inventory] INVENTORY_MULTI_PROBE > 3 có thể làm tăng round-trip; xem xét giới hạn lại.",
        );
    }
    logger.info("[inventory.config]", {
        INVENTORY_SHARDING_ENABLED,
        INVENTORY_MULTI_PROBE,
        INVENTORY_COMPAT_LEGACY,
        INVENTORY_SHARD_COUNT,
        REDIS_INV_PREFIX,
    });
}
