import { REDIS_INV_PREFIX } from "../config/inventory-flags.js";

export function sanitizeId(id) {
    return String(id ?? "")
        .trim()
        .replace(/[^A-Za-z0-9_\-:.]/g, "_");
}

export function metaKey(ticketTypeId, prefix = REDIS_INV_PREFIX) {
    const tt = sanitizeId(ticketTypeId);
    return `${prefix}:${tt}:meta`;
}

export function shardKey(ticketTypeId, i, prefix = REDIS_INV_PREFIX) {
    if (!Number.isInteger(i) || i < 0) {
        throw new Error(`[inventory.keys] shard index invalid: ${i}`);
    }
    const tt = sanitizeId(ticketTypeId);
    return `${prefix}:${tt}:shard:${i}:remaining`;
}

export function versionKey(eventId) {
    const e = sanitizeId(eventId);
    return `event:${e}:inv:version`;
}
