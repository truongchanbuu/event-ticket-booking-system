export function sanitizeId(id) {
    return String(id ?? "")
        .trim()
        .replace(/[^A-Za-z0-9_\-:.]/g, "_");
}

const INV_NS = "inv"; // GIỮ CỐ ĐỊNH. RedisService sẽ tự thêm REDIS_PREFIX.

export function metaKey(ticketTypeId, { hashTag = true } = {}) {
    const tt = sanitizeId(ticketTypeId);
    return hashTag ? `${INV_NS}:{${tt}}:meta` : `${INV_NS}:${tt}:meta`;
}

export function shardKey(ticketTypeId, i, { hashTag = true } = {}) {
    if (!Number.isInteger(i) || i < 0)
        throw new Error(`[inventory.keys] shard index invalid: ${i}`);
    const tt = sanitizeId(ticketTypeId);
    return hashTag
        ? `${INV_NS}:{${tt}}:shard:${i}:remaining`
        : `${INV_NS}:${tt}:shard:${i}:remaining`;
}

export function versionKeyByTicketType(ticketTypeId, { hashTag = true } = {}) {
    const tt = sanitizeId(ticketTypeId);
    return hashTag ? `${INV_NS}:{${tt}}:version` : `${INV_NS}:${tt}:version`;
}

export function versionKeyEventScoped(eventId, { prefix = "event" } = {}) {
    const e = sanitizeId(eventId);
    return `${prefix}:${e}:inv:version`;
}

const INV_PREFIX = process.env.REDIS_INV_PREFIX || "inv";
export const aggregateKeyByTicketType = (ttId, { hashTag = false } = {}) => {
    const tag = hashTag ? `{${ttId}}` : ttId;
    return `${INV_PREFIX}:agg:${tag}`;
};
