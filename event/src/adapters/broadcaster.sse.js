export class EmbeddedBroadcaster {
    constructor({ redisPubSub, availabilityService, logger = console }) {
        this.sub = redisPubSub;
        this.availability = availabilityService;
        this.logger = logger;
        this.sinks = new Map(); // key = slug -> Set<res>
        this.MAX_PER_KEY = 10000;
    }

    _setFor(key) {
        if (!this.sinks.has(key)) this.sinks.set(key, new Set());
        return this.sinks.get(key);
    }

    async start() {
        await this.sub.connect?.();

        // Nhận mọi sự kiện thay đổi
        await this.sub.psubscribe(
            "availability:*",
            async ({ channel, message }) => {
                try {
                    const parts = channel.split(":"); // availability:<eventId> hoặc availability:<eventId>:<slug>
                    const eventId = parts[1];
                    let payload = JSON.parse(message || "{}");
                    const slug = payload.slug || parts[2]; // Ưu tiên slug trong message

                    if (!slug) return; // không biết slug thì chịu, hoặc map eventId->slug ở đây

                    const sinks = this.sinks.get(slug);
                    if (!sinks || sinks.size === 0) return;

                    // Lấy snapshot chuẩn từ service (đảm bảo payload + ETag đồng nhất polling)
                    const snap = await this.availability.getBySlug(slug);
                    if (snap?.status !== 200) return;

                    for (const res of [...sinks]) {
                        try {
                            if (snap.etag) res.write(`id: ${snap.etag}\n`);
                            res.write(`event: update\n`);
                            res.write(`data: ${JSON.stringify(snap)}\n\n`);
                        } catch (e) {
                            try {
                                res.end();
                            } catch {}
                            sinks.delete(res);
                        }
                    }
                    if (sinks.size === 0) this.sinks.delete(slug);
                } catch (e) {
                    this.logger.warn("[Broadcaster] push failed", {
                        err: e.message,
                    });
                }
            },
        );

        this.logger.info("[Broadcaster] Subscribed availability:*");
    }

    // Express handler: /availability/stream/:slug
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

        // Heartbeat để giữ kết nối
        const hb = setInterval(() => {
            try {
                res.write(`event: ping\ndata: {}\n\n`);
            } catch {}
        }, 25000);

        // Snapshot ban đầu (giống polling lần đầu)
        try {
            const lastId = req.get?.("Last-Event-ID");
            const snap = await this.availability.getBySlug(slug);

            console.log(`snap: ${JSON.stringify(snap)}`);

            if (snap?.status === 200) {
                if (!lastId || lastId !== snap.etag) {
                    if (snap.etag) res.write(`id: ${snap.etag}\n`);
                    res.write(`event: update\n`);
                    res.write(`data: ${JSON.stringify(snap)}\n\n`);
                }
            } else {
                res.write(
                    `event: error\ndata: ${JSON.stringify({ status: snap?.status || 503 })}\n\n`,
                );
            }
        } catch (e) {
            res.write(
                `event: error\ndata: ${JSON.stringify({ message: "initial snapshot failed" })}\n\n`,
            );
        }

        const onClose = () => {
            clearInterval(hb);
            sinks.delete(res);
            if (sinks.size === 0) this.sinks.delete(slug);
            try {
                res.end();
            } catch {}
        };
        req.on("close", onClose);
        req.on?.("aborted", onClose);
        res.on?.("error", onClose);
    };
}
