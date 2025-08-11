import path from "path";
import fs from "fs";

import {
    INVENTORY_SHARDING_ENABLED,
    INVENTORY_MULTI_PROBE,
    INVENTORY_COMPAT_LEGACY,
    INVENTORY_SHARD_COUNT,
    REDIS_INV_PREFIX,
    SHARDCOUNT_CACHE_TTL_MS,
} from "../config/inventory-flags.js";

import { metaKey, shardKey, versionKey } from "../inventory/key.js";
import { allocateShards, pickShardIndex } from "../inventory/sharding.js";

export class InventoryService {
    constructor({ redisService, logger = console, pubsub }) {
        this.redis = redisService;
        this.logger = logger;
        this.pubsub = pubsub;
        this.shas = { reserve: null, release: null, seed: null };
        this._metaCache = new Map(); // ticketTypeId -> { shardCount, ts }
    }

    invKey(ttId) {
        return `inv:${ttId}:remaining`;
    }

    invVersionKey(eventId) {
        return `event:${eventId}:inv:version`;
    }

    async initialize({ seedLua, reserveLua, releaseLua }) {
        this.shas.reserve = await this.redis.scriptLoad(reserveLua);
        this.shas.release = await this.redis.scriptLoad(releaseLua);
        this.shas.seed = await this.redis.scriptLoad(seedLua);
        this.logger.info("[inventory] Lua loaded", this.shas);
    }

    // Seeding
    async loadSeedLua() {
        if (this.shas.seed) return this.shas.seed;
        const luaPath = path.resolve(
            process.cwd(),
            "../src/inventory/lua/seed.lua",
        );
        const script = fs.readFileSync(luaPath, "utf8");
        this.shas.seed = await this.redis.scriptLoad(script);
        this.logger.info("[inventory] Lua loaded (seed)", {
            seed: this.shas.seed,
        });
        return this.shas.seed;
    }

    async seedSharded(
        ticketTypeId,
        capacity,
        shardCount,
        { prefix = REDIS_INV_PREFIX } = {},
    ) {
        if (!ticketTypeId) throw new Error("ticketTypeId is required");
        const cap = Math.max(0, Number(capacity ?? 0));
        const m = Number.isFinite(shardCount)
            ? Math.max(1, Math.floor(shardCount))
            : 16;

        const allocs = allocateShards(cap, m);
        const meta = metaKey(ticketTypeId, prefix);

        const keys = [
            meta,
            ...allocs.map((_, i) => shardKey(ticketTypeId, i, prefix)),
        ];
        const argv = [String(cap), String(m), ...allocs.map(String)];

        const sha = await this.loadSeedLua();
        const result = await this.redis.evalsha(sha, keys, argv); // wrapper của bạn

        if (result === "MISMATCH") {
            const err = new Error(
                `[inventory.seed] MISMATCH for ${ticketTypeId}: capacity/shardCount differ from existing meta`,
            );
            err.code = "INVENTORY_SEED_MISMATCH";
            throw err;
        }
        if (result !== "OK" && result !== "EXISTS") {
            const err = new Error(
                `[inventory.seed] Unexpected result: ${result}`,
            );
            err.code = "INVENTORY_SEED_UNEXPECTED";
            throw err;
        }

        this.logger.info("[inventory.seed]", {
            ticketTypeId,
            capacity: cap,
            shardCount: m,
            status: result,
        });
        return { status: result, capacity: cap, shardCount: m };
    }

    async seedManySharded(ticketTypes, { prefix = REDIS_INV_PREFIX } = {}) {
        if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) return [];
        const results = [];
        for (const t of ticketTypes) {
            const cap = t.remainingQuantity ?? t.totalQuantity ?? 0;
            const shardCount =
                t.shardCount ?? this.config?.inventory?.defaultShardCount ?? 16;
            const r = await this.seedSharded(t.ticketTypeID, cap, shardCount, {
                prefix,
            });
            results.push({ ticketTypeID: t.ticketTypeID, ...r });
        }
        return results;
    }

    async getShardCount(ttId) {
        const now = Date.now();
        const hit = this._metaCache.get(ttId);
        if (hit && now - hit.ts < SHARDCOUNT_CACHE_TTL_MS)
            return hit.shardCount;

        const mKey = metaKey(ttId);
        const m = await this.redis.hgetall(mKey); // wrapper: hgetall
        const sc = Number(m?.shardCount ?? 0);
        if (!Number.isFinite(sc) || sc <= 0) {
            throw new Error(`[inventory] meta missing shardCount for ${ttId}`);
        }
        this._metaCache.set(ttId, { shardCount: sc, ts: now });
        return sc;
    }

    async loadReserveLua() {
        if (this.shas.reserve) return this.shas.reserve;
        const p = path.resolve("../src/inventory/lua/reserve.lua");
        const script = fs.readFileSync(p, "utf8");
        this.shas.reserve = await this.redis.scriptLoad(script);
        this.logger.info("[inventory] Lua loaded (reserve)", {
            sha: this.shas.reserve,
        });
        return this.shas.reserve;
    }

    async loadReleaseLua() {
        if (this.shas.release) return this.shas.release;
        const p = path.resolve("../src/inventory/lua/release.lua");
        const script = fs.readFileSync(p, "utf8");
        this.shas.release = await this.redis.scriptLoad(script);
        this.logger.info("[inventory] Lua loaded (release)", {
            sha: this.shas.release,
        });
        return this.shas.release;
    }

    buildProbeOrder(
        ttId,
        shardCount,
        affinityKey,
        maxProbe = INVENTORY_MULTI_PROBE,
    ) {
        const first = pickShardIndex(affinityKey || ttId, shardCount);
        const order = [first];
        let step = 7 % shardCount || 1;
        while (order.length < Math.min(maxProbe, shardCount)) {
            order.push((first + step) % shardCount);
        }
        return order;
    }

    async reserve(ttId, qty, { eventId, slug, affinityKey } = {}) {
        const m = await this.getShardCount(ttId);
        const probes = this.buildProbeOrder(
            ttId,
            m,
            affinityKey,
            INVENTORY_MULTI_PROBE,
        );

        const sha = await this.loadReserveLua();

        for (const idx of probes) {
            const key = shardKey(ttId, idx);
            const verK = eventId ? versionKey(eventId) : ""; // truyền rỗng nếu không có
            const [ok, val, ver] = await this.redis.evalsha(
                sha,
                [key, verK],
                [String(qty)],
            );
            if (ok === 1 || ok === "1") {
                const newRemaining = Number(val);
                await this._afterChange({
                    eventId,
                    slug,
                    ttId,
                    action: "reserve",
                    remaining: newRemaining,
                    qty,
                    shardIndex: idx,
                });
                return {
                    ok: true,
                    shardIndex: idx,
                    newRemaining,
                    version: Number(ver ?? 0),
                };
            }
        }

        const key0 = shardKey(ttId, probes[0]);
        const cur0 = Number((await this.redis.get(key0)) ?? 0);
        return { ok: false, currentRemaining: cur0 };
    }

    async _afterChange({
        eventId,
        slug,
        ttId,
        action,
        remaining,
        qty,
        shardIndex,
    }) {
        if (this.pubsub && eventId) {
            try {
                await this.pubsub.publish(
                    `availability:${eventId}`,
                    JSON.stringify({
                        eventId,
                        slug,
                        ticketTypeId: ttId,
                        remaining,
                        ts: new Date().toISOString(),
                        action,
                        qty,
                        shardIndex,
                    }),
                );
            } catch (e) {
                this.logger.warn("[availability.pub] failed", {
                    e: e.message,
                    eventId,
                    ttId,
                    action,
                });
            }
        }
        try {
            if (slug) await this.redis.del(`availability:slug:${slug}`);
        } catch (e) {
            this.logger.warn("[availability.invalidate] failed", {
                e: e.message,
                eventId,
                slug,
                ttId,
            });
        }
    }

    async release(ttId, qty, { eventId, slug, shardIndex }) {
        if (!Number.isInteger(shardIndex)) {
            throw new Error(
                "[inventory.release] shardIndex is required to release",
            );
        }
        const sha = await this.loadReleaseLua();
        const key = shardKey(ttId, shardIndex);
        const verK = eventId ? versionKey(eventId) : "";
        const [ok, newRemaining, ver] = await this.redis.evalsha(
            sha,
            [key, verK],
            [String(qty)],
        );

        if (ok === 1 || ok === "1") {
            await this._afterChange({
                eventId,
                slug,
                ttId,
                action: "release",
                remaining: Number(newRemaining),
                qty,
                shardIndex,
            });
            return {
                ok: true,
                newRemaining: Number(newRemaining),
                version: Number(ver ?? 0),
            };
        }
        return { ok: false, newRemaining: Number(newRemaining) };
    }

    async readAggregatedCountersWithVersion(eventId, ttIds = []) {
        if (!ttIds.length) return { remains: [], invVersion: 0 };

        const shardCounts = await Promise.all(
            ttIds.map((tt) => this.getShardCount(tt)),
        );

        const shardKeys = [];
        for (let i = 0; i < ttIds.length; i++) {
            const tt = ttIds[i];
            const m = shardCounts[i];
            for (let j = 0; j < m; j++) shardKeys.push(shardKey(tt, j));
        }

        const pipe = this.redis.pipeline ? this.redis.pipeline() : null;
        let replies, rawShards, rawVersion;

        if (pipe) {
            shardKeys.forEach((k) => pipe.get(k));
            pipe.get(versionKey(eventId));
            replies = await pipe.exec();
            rawShards = replies.slice(0, shardKeys.length).map((r) => r[1]);
            rawVersion = replies[shardKeys.length][1];
        } else {
            rawShards = await this.redis.mgetRaw(shardKeys);
            rawVersion = await this.redis.get(versionKey(eventId));
        }

        const remains = [];
        let cursor = 0;
        for (let i = 0; i < ttIds.length; i++) {
            const m = shardCounts[i];
            let sum = 0;
            for (let j = 0; j < m; j++) {
                sum += Number(rawShards[cursor + j] ?? 0);
            }
            cursor += m;
            remains.push(sum);
        }

        const invVersion = Number(rawVersion ?? 0);
        return {
            remains,
            invVersion: Number.isFinite(invVersion) ? invVersion : 0,
        };
    }
}
