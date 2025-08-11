export class EmbeddedBroadcaster {
    constructor({ redisPubSub, availabilityService, logger = console }) {
        this.sub = redisPubSub;
        this.availability = availabilityService;
        this.logger = logger;

        // slug -> Set<res>
        this.sinks = new Map();
        this.MAX_PER_KEY = 10000;

        // Debounce per slug: slug -> Timeout
        this.pending = new Map();
        this.coalesceMs = 80;

        // Dedup theo ETag: res -> etag
        this.lastEtag = new WeakMap();
    }

    _setFor(key) {
        if (!this.sinks.has(key)) this.sinks.set(key, new Set());
        return this.sinks.get(key);
    }

    _schedulePush = (slug) => {
        if (this.pending.has(slug)) return;
        const t = setTimeout(async () => {
            this.pending.delete(slug);
            const sinks = this.sinks.get(slug);
            if (!sinks || sinks.size === 0) return;

            let snap;
            try {
                snap = await this.availability.getBySlug(slug);
            } catch (e) {
                this.logger.warn("[Broadcaster] snapshot failed", {
                    slug,
                    err: e?.message,
                });
                return;
            }
            if (!snap || snap.status !== 200) return;

            for (const res of [...sinks]) {
                try {
                    const last = this.lastEtag.get(res);
                    if (snap.etag && last === snap.etag) continue; // ✅ dedup

                    if (snap.etag) {
                        this.lastEtag.set(res, snap.etag);
                        res.write(`id: ${snap.etag}\n`);
                    }
                    res.write(`event: update\n`);
                    res.write(`data: ${JSON.stringify(snap)}\n\n`);
                } catch {
                    try {
                        res.end();
                    } catch {}
                    sinks.delete(res);
                    this.lastEtag.delete(res);
                }
            }
            if (sinks.size === 0) this.sinks.delete(slug);
        }, this.coalesceMs);
        this.pending.set(slug, t);
    };

    async start() {
        await this.sub.connect?.();

        // Nhận mọi sự kiện thay đổi tồn kho
        await this.sub.psubscribe(
            "availability:*",
            async ({ channel, message }) => {
                try {
                    const parts = String(channel).split(":"); // availability:<eventId>[:<slug>]
                    const eventId = parts[1];
                    const payload = JSON.parse(message || "{}");
                    const slug = payload.slug || parts[2]; // Ưu tiên slug trong payload

                    if (!slug) return; // không xác định được slug thì bỏ
                    const sinks = this.sinks.get(slug);
                    if (!sinks || sinks.size === 0) return;

                    // ✅ debounce/coalesce theo slug
                    this._schedulePush(slug);
                } catch (e) {
                    this.logger.warn(
                        "[Broadcaster] psubscribe handler failed",
                        { err: e?.message },
                    );
                }
            },
        );

        this.logger.info("[Broadcaster] Subscribed availability:*");
    }

    sseHandler = async (req, res) => {
        const slug = String(req.params.slug || req.query.slug || "");
        if (!slug) {
            res.status(400).json({ message: "Missing slug" });
            return;
        }

        // SSE headers
        req.socket.setTimeout?.(0);
        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        res.flushHeaders?.();
        res.write(`retry: 3000\n\n`);

        const sinks = this._setFor(slug);
        if (sinks.size >= this.MAX_PER_KEY) {
            res.write(`event: error\ndata: {"message":"Too many clients"}\n\n`);
            res.end();
            return;
        }
        sinks.add(res);

        const hb = setInterval(() => {
            try {
                res.write(`event: ping\ndata: {}\n\n`);
            } catch {}
        }, 25000);

        try {
            const lastId = req.get?.("Last-Event-ID");
            const snap = await this.availability.getBySlug(slug);
            if (snap?.status === 200) {
                const last = this.lastEtag.get(res);
                if (!lastId || lastId !== snap.etag || last !== snap.etag) {
                    if (snap.etag) {
                        this.lastEtag.set(res, snap.etag);
                        res.write(`id: ${snap.etag}\n`);
                    }
                    res.write(`event: update\n`);
                    res.write(`data: ${JSON.stringify(snap)}\n\n`);
                }
            } else {
                res.write(
                    `event: error\ndata: ${JSON.stringify({ status: snap?.status || 503 })}\n\n`,
                );
            }
        } catch {
            res.write(
                `event: error\ndata: ${JSON.stringify({ message: "initial snapshot failed" })}\n\n`,
            );
        }

        const onClose = () => {
            clearInterval(hb);
            const set = this.sinks.get(slug);
            set?.delete(res);
            if (set && set.size === 0) this.sinks.delete(slug);
            this.lastEtag.delete(res);
            try {
                res.end();
            } catch {}
        };
        req.on("close", onClose);
        req.on?.("aborted", onClose);
        res.on?.("error", onClose);
    };
}
