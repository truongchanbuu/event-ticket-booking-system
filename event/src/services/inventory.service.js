import path from "path";
import fs from "fs";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
    INVENTORY_SHARDING_ENABLED,
    INVENTORY_MULTI_PROBE,
    INVENTORY_COMPAT_LEGACY,
    INVENTORY_SHARD_COUNT,
    SHARDCOUNT_CACHE_TTL_MS,
} from "../config/inventory-flags.js";

import { metaKey, shardKey, versionKeyByTicketType } from "../inventory/key.js";
import { allocateShards, pickShardIndex } from "../inventory/sharding.js";

export class InventoryService {
    constructor({
        inventoryMetaRepo,
        redisService,
        logger = console,
        redisPubSub,
        availabilityProducer,
    }) {
        this.inventoryMetaRepo = inventoryMetaRepo;
        this.redis = redisService;
        this.logger = logger;
        this.pubsub = redisPubSub;
        this.availabilityProducer = availabilityProducer;
        this.shas = { reserve: null, release: null, seed: null };
        this._metaCache = new Map(); // ticketTypeId -> { shardCount, ts }
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
        const luaPath = path.resolve(__dirname, "../inventory/lua/seed.lua");
        const script = fs.readFileSync(luaPath, "utf8");
        this.shas.seed = await this.redis.scriptLoad(script);
        this.logger.info("[inventory] Lua loaded (seed)", {
            seed: this.shas.seed,
        });
        return this.shas.seed;
    }

    async seedSharded(
        ttId,
        capacity,
        shardCount,
        { ttlSec = 7 * 24 * 3600, forceRepair = false, eventId } = {},
    ) {
        const m = Math.max(1, Math.floor(shardCount));
        const allocs = allocateShards(capacity, m);

        const meta = metaKey(ttId, { hashTag: true });
        const ver = versionKeyByTicketType(ttId, { hashTag: true });
        const keys = [
            meta,
            ver,
            ...Array.from({ length: m }, (_, i) =>
                shardKey(ttId, i, { hashTag: true }),
            ),
        ];

        console.log(`[SHARD KEY] - shards: ${keys}`);

        const argv = [
            String(capacity), // ARGV[1]
            String(m), // ARGV[2]
            String(ttlSec || 0), // ARGV[3]
            forceRepair ? "1" : "0", // ARGV[4]
            ...allocs.map(String), // ARGV[5..]
        ];

        const sha = await this.loadSeedLua();
        const res = await this.redis.evalsha(sha, keys, argv);

        if (res === "MISMATCH") throw new Error("INVENTORY_SEED_MISMATCH");
        if (
            !["OK", "EXISTS"].includes(String(res)) &&
            !String(res).startsWith("REPAIRED:")
        ) {
            throw new Error(`INVENTORY_SEED_UNEXPECTED:${res}`);
        }

        if (this.inventoryMetaRepo && eventId) {
            try {
                await this.inventoryMetaRepo.upsert({
                    ttId,
                    eventID: eventId,
                    capacity: Number(capacity) || 0,
                    shardCount: Math.max(1, Math.floor(shardCount)),
                    version: 0,
                });
            } catch (e) {
                this.logger.warn("[inventory.meta.persist] failed", {
                    ttId,
                    eventId,
                    err: e?.message,
                });
            }
        } else {
            this.logger.debug?.("[inventory.meta.persist] skipped", {
                ttId,
                eventId,
                hasRepo: !!this.inventoryMetaRepo,
            });
        }
        return res; // "OK" | "EXISTS" | "REPAIRED:N"    }
    }

    async seedManySharded(ticketTypes) {
        if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) return [];
        const results = [];
        for (const t of ticketTypes) {
            const cap = t.remainingQuantity ?? t.totalQuantity ?? 0;
            const shardCount =
                t.shardCount ?? this.config?.inventory?.defaultShardCount ?? 16;
            const r = await this.seedSharded(t.ticketTypeID, cap, shardCount, {
                eventId: t.eventId || t.eventID,
            });
            results.push({ ticketTypeID: t.ticketTypeID, result: String(r) });
        }

        return results;
    }

    async getShardCount(ttId) {
        console.log(`[TICKETID] - ${ttId}`);
        const now = Date.now();
        const cached = this._metaCache.get(ttId);
        if (cached && now - cached.ts < SHARDCOUNT_CACHE_TTL_MS) {
            return cached.shardCount;
        }

        this.logger.warn("[inv.debug] adapter", {
            hasHgetall: typeof this.redis?.hgetall,
            kind: this.redis?.kind,
        });

        const kTag = metaKey(ttId, { hashTag: true });
        const kNo = metaKey(ttId, { hashTag: false });

        const m1 = await this.redis.hgetall(kTag);
        const m2 =
            m1 && Object.keys(m1).length ? null : await this.redis.hgetall(kNo);

        this.logger.warn("[inv.debug] meta read", {
            ttId,
            kTag,
            kNo,
            m1,
            m2,
        });

        const m = m1 && Object.keys(m1).length ? m1 : m2;
        const sc = Number(m?.shardCount ?? 0);

        if (!Number.isFinite(sc) || sc <= 0) {
            if (this.inventoryMetaRepo) {
                try {
                    const doc = await this.inventoryMetaRepo.get(ttId);
                    const sc2 = Number(doc?.shardCount ?? 0);
                    if (Number.isFinite(sc2) && sc2 > 0) {
                        this._metaCache.set(ttId, { shardCount: sc2, ts: now });
                        return sc2;
                    }
                } catch {}
            }

            try {
                const info = await this.redis.raw?.info?.("keyspace");
                this.logger.warn("[inv.debug] keyspace", { keyspace: info });
            } catch {}
            throw new Error(`[inventory] meta missing shardCount for ${ttId}`);
        }

        this._metaCache.set(ttId, { shardCount: sc, ts: now });
        return sc;
    }

    async loadReserveLua() {
        if (this.shas.reserve) return this.shas.reserve;
        const p = path.resolve(__dirname, "../inventory/lua/reserve.lua");
        const script = fs.readFileSync(p, "utf8");
        this.shas.reserve = await this.redis.scriptLoad(script);
        this.logger.info("[inventory] Lua loaded (reserve)", {
            sha: this.shas.reserve,
        });
        return this.shas.reserve;
    }

    async loadReleaseLua() {
        if (this.shas.release) return this.shas.release;
        const p = path.resolve(__dirname, "../inventory/lua/release.lua");
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
        extraProbes = INVENTORY_MULTI_PROBE,
    ) {
        const first = pickShardIndex(affinityKey || ttId, shardCount);
        const total = Math.min(1 + Math.max(0, extraProbes), shardCount); // first + extra
        const order = [first];
        let offset = 1;
        while (order.length < total) {
            order.push((first + offset) % shardCount);
            offset++;
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

        if (probes.length) {
            const inspectKeys = probes
                .slice(0, Math.min(4, probes.length))
                .map((i) => shardKey(ttId, i, { hashTag: true }));
            const vals = await (this.redis.mgetRaw
                ? this.redis.mgetRaw(inspectKeys)
                : Promise.all(inspectKeys.map((k) => this.redis.get(k))));
            this.logger.warn("[reserve.peek]", { ttId, inspectKeys, vals });
        }

        const sha = await this.loadReserveLua();
        this.logger.warn("[reserve.debug] args", {
            ttId,
            qty,
            typeOfQty: typeof qty,
        });

        for (const idx of probes) {
            const shardKeyStr = shardKey(ttId, idx, { hashTag: true });
            const verKey = versionKeyByTicketType(ttId, { hashTag: true });
            const keys = [shardKeyStr, verKey];

            this.logger.warn?.("[reserve.keys]", { shardKeyStr, verKey, qty });

            const [ok, val, invVersion] = await this.redis.evalsha(sha, keys, [
                String(qty),
            ]);
            if (Number(ok) === 1) {
                const newRemaining = Number(val);
                await this._afterChange({
                    eventId,
                    slug,
                    ttId,
                    action: "reserve",
                    remaining: newRemaining,
                    qty,
                    shardIndex: idx,
                    invVersion: Number(invVersion ?? 0),
                });
                return {
                    ok: true,
                    shardIndex: idx,
                    newRemaining,
                    version: Number(invVersion ?? 0),
                };
            }
        }

        const key0 = shardKey(ttId, probes[0], { hashTag: true });
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
        invVersion,
    }) {
        // 1) Invalidate cache theo slug (không block)
        const invalidate = slug
            ? this.redis.del(`availability:slug:${slug}`).catch((e) => {
                  this.logger.warn("[availability.invalidate] failed", {
                      e: e.message,
                      eventId,
                      slug,
                      ttId,
                  });
              })
            : Promise.resolve();

        if (!eventId) {
            await invalidate;
            return;
        }

        // 2) Tính tổng sau thay đổi (nếu chưa có aggregate total key)
        let totalAfter = 0;
        try {
            totalAfter = await this._sumShards(ttId);
        } catch (e) {
            this.logger.warn("[availability.sum] failed", {
                ttId,
                e: e.message,
            });
        }
        const delta = action === "reserve" ? -Math.abs(qty) : Math.abs(qty);
        const totalBefore = totalAfter - delta;

        // 3) Pub/Sub payload nội bộ (realtime/cache)
        const pubPayload = JSON.stringify({
            eventId,
            slug,
            ticketTypeId: ttId,
            action,
            qty,
            shardIndex,
            remainingOnShard: remaining,
            totalRemaining: totalAfter,
            invVersion: Number(invVersion ?? 0),
            ts: new Date().toISOString(),
        });

        const pub = this.pubsub
            ? this.pubsub
                  .publish(`availability:${eventId}`, pubPayload)
                  .catch((e) => {
                      this.logger.warn("[availability.pub] failed", {
                          e: e.message,
                          eventId,
                          ttId,
                          action,
                      });
                  })
            : Promise.resolve();

        // 4) Kafka availability (durable, cho các service khác)
        const kafka = (async () => {
            if (!this.availabilityProducer) return;
            try {
                await this.availabilityProducer.changed(
                    {
                        eventId,
                        ticketTypeId: ttId,
                        remaining: totalAfter,
                        delta,
                        invVersion: Number(invVersion ?? 0),
                        shardIndex,
                    },
                    { source: "event-service" },
                );
                if (
                    action === "reserve" &&
                    totalAfter === 0 &&
                    totalBefore > 0
                ) {
                    await this.availabilityProducer.soldOut(
                        { eventId, ticketTypeId: ttId },
                        { source: "event-service" },
                    );
                }
                if (
                    action === "release" &&
                    totalBefore === 0 &&
                    totalAfter > 0
                ) {
                    await this.availabilityProducer.restocked(
                        { eventId, ticketTypeId: ttId, remaining: totalAfter },
                        { source: "event-service" },
                    );
                }
            } catch (e) {
                this.logger.warn("[availability.kafka] failed", e?.message);
            }
        })();

        // 5) chạy song song, không block đường chính quá lâu
        await Promise.allSettled([invalidate, pub, kafka]);
    }

    async _sumShards(ttId) {
        const m = await this.getShardCount(ttId);
        const keys = Array.from({ length: m }, (_, i) => shardKey(ttId, i));
        const vals = this.redis.mgetRaw
            ? await this.redis.mgetRaw(keys)
            : await Promise.all(keys.map((k) => this.redis.get(k)));
        return vals.reduce((s, v) => s + Number(v ?? 0), 0);
    }

    async release(ttId, qty, { eventId, slug, shardIndex }) {
        if (!Number.isInteger(shardIndex)) {
            throw new Error(
                "[inventory.release] shardIndex is required to release",
            );
        }
        const sha = await this.loadReleaseLua();

        const shardKeyStr = shardKey(ttId, shardIndex, { hashTag: true });
        const verKey = versionKeyByTicketType(ttId, { hashTag: true });
        const keys = [shardKeyStr, verKey];

        const [ok, newRemaining, invVersion] = await this.redis.evalsha(
            sha,
            keys,
            [String(qty)],
        );
        if (Number(ok) === 1) {
            await this._afterChange({
                eventId,
                slug,
                ttId,
                action: "release",
                remaining: Number(newRemaining),
                qty,
                shardIndex,
                invVersion: Number(invVersion ?? 0),
            });

            return {
                ok: true,
                newRemaining: Number(newRemaining),
                version: Number(invVersion ?? 0),
            };
        }

        return { ok: false, newRemaining: Number(newRemaining) };
    }

    async readAggregatedCountersWithVersion(eventId, ttIds = []) {
        if (!ttIds.length) return { remains: [], invVersion: 0 };

        const shardCounts = await Promise.all(
            ttIds.map((tt) => this.getShardCount(tt)),
        );

        const keyOpts = { hashTag: true };
        const shardKeys = [];
        for (let i = 0; i < ttIds.length; i++) {
            const tt = ttIds[i];
            const m = shardCounts[i];
            for (let j = 0; j < m; j++) {
                shardKeys.push(shardKey(tt, j, keyOpts));
            }
        }

        console.warn("[read.debug]", {
            ttIds,
            shardCounts,
            sample: shardKeys.slice(0, 8),
        });

        const rawShards = await this.redis.mgetRaw(shardKeys);
        const rawVersions = await Promise.all(
            ttIds.map((tt) => this.redis.get(versionKeyByTicketType(tt))),
        );

        const remains = [];
        let idx = 0;
        for (let i = 0; i < ttIds.length; i++) {
            const m = shardCounts[i];
            let sum = 0;
            for (let j = 0; j < m; j++) sum += Number(rawShards[idx + j] ?? 0);
            idx += m;
            remains.push(sum);
        }

        const invVersion = Math.max(
            0,
            ...rawVersions
                .map((v) => Number(v ?? 0))
                .filter((n) => Number.isFinite(n)),
        );

        return {
            remains,
            invVersion: Number.isFinite(invVersion) ? invVersion : 0,
        };
    }

    async syncInventoryMeta(ttId, { eventId, shardCount: scOverride } = {}) {
        if (!this.inventoryMetaRepo || !eventId) {
            this.logger.debug?.("[inventory.meta.sync] skipped", {
                ttId,
                eventId,
                hasRepo: !!this.inventoryMetaRepo,
            });
            return {
                sum: null,
                version: null,
                hasNegative: null,
                skipped: true,
            };
        }

        const m = scOverride || (await this.getShardCount(ttId));
        const keys = Array.from({ length: m }, (_, i) => shardKey(ttId, i));
        const vals = this.redis.mgetRaw
            ? await this.redis.mgetRaw(keys)
            : await Promise.all(keys.map((k) => this.redis.get(k)));

        const nums = vals.map((v) => Number(v ?? 0));
        const sum = nums.reduce((a, b) => a + b, 0);
        const hasNegative = nums.some((n) => n < 0);
        const version =
            Number(await this.redis.get(versionKeyByTicketType(ttId))) || 0;

        try {
            await this.inventoryMetaRepo.touchSync(ttId, {
                version,
                negativesDetected: hasNegative,
            });
        } catch (e) {
            this.logger.warn("[inventory.meta.sync] failed", {
                ttId,
                eventId,
                err: e?.message,
            });
        }
        return { sum, version, hasNegative, skipped: false };
    }
}
