// ESM, dev-only debug endpoint:
// GET /debug/stock/:tt  -> { capacity, shardCount, remainingTotal, heldTotal, soldTotal, holdsActive, invariant }
import { Router } from "express";
import assert from "node:assert/strict";
import { metaKey, shardKey } from "../inventory/key.js";

export function debugRouter({ redisService, logger = console } = {}) {
    assert(redisService, "redisService client required");
    const r = Router();

    r.get("/api/debug/stock/:tt", async (req, res) => {
        try {
            const tt = String(req.params.tt);
            const mKey = metaKey(tt);
            const meta = await redisService.hgetall(mKey);
            if (!meta || !meta.capacity) {
                return res
                    .status(404)
                    .json({ ok: false, error: "META_NOT_FOUND", meta });
            }
            const capacity = Number(meta.capacity || 0);
            const shardCount = Number(meta.shardCount || 0);
            const sKeys = Array.from({ length: shardCount }, (_, i) =>
                shardKey(tt, i),
            );

            // Sum remaining across shards
            const sVals = await redisService.mget(sKeys);
            const remainingTotal = (sVals || []).reduce(
                (a, b) => a + Number(b || 0),
                0,
            );

            // Scan holds and compute heldTotal (sum qty in each hold.lines for this tt)
            let cursor = "0";
            let holdsActive = 0;
            let heldTotal = 0;
            do {
                const [next, keys] = await redisService.scan(
                    cursor,
                    "MATCH",
                    "hold:*",
                    "COUNT",
                    1000,
                );
                cursor = next;
                if (keys.length) {
                    const vals = await redisService.mget(keys);
                    for (const raw of vals) {
                        if (!raw) continue;
                        try {
                            const h = JSON.parse(raw);
                            const lines = Array.isArray(h?.lines)
                                ? h.lines
                                : [];
                            for (const l of lines) {
                                if (String(l.ttId) === tt) {
                                    heldTotal += Number(l.qty || 0);
                                }
                            }
                            holdsActive++;
                        } catch (_) {}
                    }
                }
            } while (cursor !== "0");

            // soldTotal = phần đã commit (xấp xỉ): capacity - remaining - held
            let soldTotal = capacity - remainingTotal - heldTotal;
            if (soldTotal < 0) soldTotal = 0; // clamp dev-friendly

            return res.json({
                ok: true,
                ticketTypeId: tt,
                capacity,
                shardCount,
                remainingTotal,
                heldTotal,
                soldTotal,
                holdsActive,
                invariant: {
                    sumMatchesCapacity:
                        remainingTotal + heldTotal + soldTotal === capacity,
                    nonNegativeRemaining: remainingTotal >= 0,
                    note: "PASS if sumMatchesCapacity && nonNegativeRemaining",
                },
            });
        } catch (e) {
            logger.error("[/debug/stock] failed", e);
            return res.status(500).json({
                ok: false,
                error: "INTERNAL_ERROR",
                message: e?.message,
            });
        }
    });

    return r;
}
