export class EmbeddedBroadcaster {
    constructor({ redisPubSub, logger = console }) {
        this.sub = redisPubSub;
        this.logger = logger;
        this.sinks = new Map(); // eventId -> Set<res>
    }

    _setFor(id) {
        if (!this.sinks.has(id)) this.sinks.set(id, new Set());
        return this.sinks.get(id);
    }

    async start() {
        await this.sub.connect?.();
        await this.sub.psubscribe("availability:*", ({ channel, message }) => {
            const eventId = channel.split(":")[1];
            const set = this.sinks.get(eventId);
            if (!set || set.size === 0) return;

            let payload;
            try {
                payload = JSON.parse(message);
            } catch {
                payload = { raw: message };
            }

            for (const res of set) {
                try {
                    const idLine = payload?.etag ? `id: ${payload.etag}\n` : "";
                    res.write(`${idLine}event: update\n`);
                    res.write(`data: ${JSON.stringify(payload)}\n\n`);
                } catch (e) {
                    try {
                        res.end();
                    } catch {}
                    set.delete(res);
                }
            }
        });
        this.logger.info("[Broadcaster] Subscribed availability:*");
    }

    // Express handler
    sseHandler = (req, res) => {
        const { id } = req.params;
        console.log(`EVENT ID: ${id}`);
        req.socket.setTimeout?.(0);
        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });

        const set = this._setFor(id);
        set.add(res);

        const hb = setInterval(() => {
            try {
                res.write(`event: ping\ndata: {}\n\n`);
            } catch {}
        }, 25_000);

        req.on("close", () => {
            clearInterval(hb);
            set.delete(res);
            try {
                res.end();
            } catch {}
        });
    };
}
