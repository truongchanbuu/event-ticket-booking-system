import { REDIS_INV_PREFIX } from "../config/inventory-flags.js";

export function sanitizeId(id) {
    return String(id ?? "")
        .trim()
        .replace(/[^A-Za-z0-9_\-:.]/g, "_");
}

// prefix: "inv" (không cần ":"), hashTag = true để tạo inv:{TT_A}:meta
export function metaKey(
    ticketTypeId,
    { prefix = REDIS_INV_PREFIX, hashTag = true } = {},
) {
    const tt = sanitizeId(ticketTypeId);
    return hashTag ? `${prefix}:{${tt}}:meta` : `${prefix}:${tt}:meta`;
}

export function shardKey(
    ticketTypeId,
    i,
    { prefix = REDIS_INV_PREFIX, hashTag = true } = {},
) {
    if (!Number.isInteger(i) || i < 0) {
        throw new Error(`[inventory.keys] shard index invalid: ${i}`);
    }
    const tt = sanitizeId(ticketTypeId);
    return hashTag
        ? `${prefix}:{${tt}}:shard:${i}:remaining`
        : `${prefix}:${tt}:shard:${i}:remaining`;
}

export function versionKey(
    eventId,
    { prefix = "event", hashTag = false } = {},
) {
    const e = sanitizeId(eventId);
    return `${prefix}:${e}:inv:version`;
}
