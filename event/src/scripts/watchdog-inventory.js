#!/usr/bin/env node
import "dotenv/config";
import {
    assertInventoryConfig,
    REDIS_INV_PREFIX,
} from "../config/inventory-flags.js";

assertInventoryConfig(console);
console.log("[seed-batch] effective prefix =", REDIS_INV_PREFIX);

import Redis from "ioredis";
import { internalHttpClient } from "@event_ticket_booking_system/shared";
import { metaKey, shardKey } from "../inventory/key.js";
import { TicketClientService } from "../services/ticket-client.service.js";
import { EventSource } from "./libs/event-source.js";

const LOG = console;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const eventSource = new EventSource({
    mode: process.env.EVENTS_SOURCE_MODE || "service",
    eventServiceUrl: process.env.EVENT_SERVICE_URL,
    eventServiceKey: process.env.SERVICE_SECRET_KEY,
    http: internalHttpClient,
    logger: LOG,
});

const ticketClient = new TicketClientService({
    config: {
        service_urls: { ticket_service: process.env.TICKET_SERVICE_URL },
        service_keys: { ticket_service: process.env.TICKET_SERVICE_SECRET_KEY },
    },
    internalHttpClient: internalHttpClient,
    logger: LOG,
});

async function listTicketTypesOfEvent(eventId) {
    const resp = await ticketClient.getEventTicketTypes(eventId);
    console.log(`resp: ${JSON.stringify(resp)}`);
    if (resp.status !== 200) return [];
    return (resp.data || []).map((t) => t.ticketTypeID || t.id).filter(Boolean);
}

async function runOnce(redis) {
    const eventIds = await eventSource.listActiveEventIds();
    let checked = 0,
        healed = 0,
        errors = 0;

    for (const eventId of eventIds) {
        const ttIds = await listTicketTypesOfEvent(eventId);
        for (const tt of ttIds) {
            try {
                const meta = await redis.hgetall(metaKey(tt));
                const m = Number(meta?.shardCount || 0);
                if (!m) continue;

                const keys = Array.from({ length: m }, (_, i) =>
                    shardKey(tt, i),
                );
                const vals = await redis.mget(keys);

                let sum = 0;
                for (let i = 0; i < m; i++) {
                    const v = vals[i];
                    if (v === null) {
                        await redis.setnx(keys[i], 0);
                        healed++;
                        LOG.warn("[watchdog] healed missing shard", {
                            tt,
                            shard: i,
                        });
                    } else {
                        sum += Number(v);
                    }
                }

                if (Number.isFinite(sum) && sum < 0) {
                    errors++;
                    LOG.error("[watchdog] negative inventory detected", {
                        tt,
                        sum,
                    });
                }
                checked++;
            } catch (e) {
                errors++;
                LOG.warn("[watchdog] error", { tt, err: e?.message });
            }
        }
    }

    LOG.info("[watchdog] summary", {
        checked,
        healed,
        errors,
        at: new Date().toISOString(),
    });
}

async function main() {
    const redis = new Redis(REDIS_URL);
    try {
        await runOnce(redis);
    } finally {
        await redis.quit();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
