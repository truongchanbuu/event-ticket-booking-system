#!/usr/bin/env node
import "dotenv/config";
import {
    assertInventoryConfig,
    REDIS_INV_PREFIX,
} from "../config/inventory-flags.js";

assertInventoryConfig(console);
console.log("[seed-batch] effective prefix =", REDIS_INV_PREFIX);

import Redis from "ioredis";
import fs from "node:fs";
import path from "node:path";

import { EventSource } from "./libs/event-source.js";

import { TicketClientService } from "../services/ticket-client.service.js";
import { metaKey, shardKey, versionKey } from "../inventory/key.js";
import { allocateShards } from "../inventory/sharding.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const SEED_SHARDS = Number(process.env.INVENTORY_SHARD_COUNT || 16);

const eventSource = new EventSource({
    mode: process.env.EVENTS_SOURCE_MODE || "service",
    logger: console,
});

const ticketClient = new TicketClientService({
    httpRegistry: {
        tickets: {
            baseURL: process.env.TICKET_SERVICE_URL,
            apiKey: process.env.TICKET_SERVICE_SECRET_KEY,
        },
    },
    logger: console,
});

async function main() {
    const redis = new Redis(REDIS_URL);
    let ok = 0,
        exists = 0,
        mismatch = 0,
        total = 0;

    const luaPath = path.resolve("src/inventory/lua/seed.lua");
    const seedLua = fs.readFileSync(luaPath, "utf8");
    const seedSha = await redis.script("LOAD", seedLua);
    console.log("[seed-batch] seed.lua loaded", { sha: seedSha, luaPath });

    async function seedOne({ ticketTypeID, capacity, shardCount }) {
        const cap = Math.max(0, Number(capacity || 0));
        const m = Math.max(1, Number(shardCount || SEED_SHARDS));
        const allocs = allocateShards(cap, m);
        const keys = [
            metaKey(ticketTypeID),
            ...allocs.map((_, i) => shardKey(ticketTypeID, i)),
        ];
        const argv = [String(cap), String(m), ...allocs.map(String)];

        console.log("[seed] tt", ticketTypeID, {
            cap,
            m,
            metaKey: metaKey(ticketTypeID),
        });
        const res = await redis.evalsha(seedSha, keys.length, ...keys, ...argv);
        console.log("[seed] result", { tt: ticketTypeID, res, keys });

        if (res === "MISMATCH")
            throw new Error(`MISMATCH seed for ${ticketTypeID}`);
        if (res !== "OK" && res !== "EXISTS")
            throw new Error(`Unexpected seed result ${res}`);
        return res;
    }

    try {
        const eventIds = await eventSource.listActiveEventIds();
        console.log("[seed-batch] events:", eventIds.length);

        for (const eventId of eventIds) {
            const ttResp = await ticketClient.getEventTicketTypes(eventId);
            if (ttResp.status !== 200) {
                console.warn("[seed-batch] ticket-service non-200", {
                    eventId,
                    status: ttResp.status,
                });
                continue;
            }
            const tts = (ttResp.data || [])
                .map((t) => ({
                    ticketTypeID: t.ticketTypeID || t.id,
                    capacity: t.remainingQuantity ?? t.totalQuantity ?? 0,
                    shardCount: t.shardCount ?? SEED_SHARDS,
                }))
                .filter((t) => t.ticketTypeID);

            for (const t of tts) {
                total++;
                try {
                    const res = await seedOne(t);
                    if (res === "OK") ok++;
                    else exists++;
                } catch (e) {
                    if (String(e.message).includes("MISMATCH")) mismatch++;
                    else
                        console.error("[seed-batch] error", {
                            tt: t.ticketTypeID,
                            err: e.message,
                        });
                }
            }

            await redis.set(versionKey(eventId), "0", "NX");
        }

        console.log("[seed-batch] summary", { total, ok, exists, mismatch });
        if (mismatch > 0) process.exitCode = 2;
    } finally {
        await redis.quit();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
