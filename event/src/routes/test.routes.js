import { Router } from "express";

export class TestRoutes {
    constructor({ inventoryService, logger = console }) {
        this.router = Router();

        // Đặt số lượng còn lại “thủ công” (thiết lập trạng thái trước khi test)
        this.router.post("/__test/inv/set", async (req, res) => {
            const { ttId, remaining } = req.body || {};
            if (!ttId || typeof remaining !== "number") {
                return res
                    .status(400)
                    .json({ message: "ttId & remaining required" });
            }
            // set trực tiếp key Redis (bỏ qua Lua) — chỉ dùng trong DEV!
            const key = `inv:${ttId}:remaining`;
            const redis = req.container.resolve("redisClient"); // wrapper của bạn
            await redis.setEx(key, String(remaining), 24 * 3600); // TTL 1 ngày để khỏi sót key
            return res.json({ ok: true, key, remaining });
        });

        // Giả lập reserve qua service chuẩn (Lua + publish)
        this.router.post("/__test/reserve", async (req, res) => {
            const { ttId, qty = 1, eventId, slug } = req.body || {};
            if (!ttId || !eventId) {
                return res
                    .status(400)
                    .json({ message: "ttId & eventId required" });
            }
            try {
                const out = await inventoryService.reserve(ttId, Number(qty), {
                    eventId,
                    slug,
                });
                return res.json({ ok: true, result: out });
            } catch (e) {
                logger.error("[__test/reserve]", e);
                return res
                    .status(500)
                    .json({ ok: false, error: String(e?.message || e) });
            }
        });

        // Giả lập release qua service chuẩn
        this.router.post("/__test/release", async (req, res) => {
            const { ttId, qty = 1, eventId, slug } = req.body || {};
            if (!ttId || !eventId) {
                return res
                    .status(400)
                    .json({ message: "ttId & eventId required" });
            }
            try {
                const out = await inventoryService.release(ttId, Number(qty), {
                    eventId,
                    slug,
                });
                return res.json({ ok: true, result: out });
            } catch (e) {
                logger.error("[__test/release]", e);
                return res
                    .status(500)
                    .json({ ok: false, error: String(e?.message || e) });
            }
        });

        // (Tuỳ chọn) chỉ publish không đổi inventory — giống Cách 1 nhưng qua HTTP
        this.router.post("/__test/publish", async (req, res) => {
            const { eventId, ticketTypeId, remaining, status, etag } =
                req.body || {};
            if (!eventId)
                return res.status(400).json({ message: "eventId required" });
            const pubsub = req.container.resolve("redisPubSub");
            await pubsub.publish(
                `availability:${eventId}`,
                JSON.stringify({
                    eventId,
                    ticketTypeId,
                    remaining,
                    status,
                    etag,
                    ts: new Date().toISOString(),
                }),
            );
            return res.json({ ok: true });
        });
    }
}
