export class EmbeddedBroadcaster {
    constructor({ redisPubSub, availabilityService, logger = console }) {
        this.sub = redisPubSub;
        this.availability = availabilityService;
        this.logger = logger;

        // slug -> Set<ServerResponse>
        this.sinks = new Map();
        this.MAX_PER_KEY = 10000;

        // Debounce per slug: slug -> Timeout
        this.pending = new Map();
        this.coalesceMs = 80;

        // Dedup theo ETag: res -> etag
        this.lastEtag = new WeakMap();

        this.latestInvVersion = new Map();
    }

    _setFor(key) {
        if (!this.sinks.has(key)) this.sinks.set(key, new Set());
        return this.sinks.get(key);
    }

    _parseInvVersion(v) {
        if (v == null) return undefined;
        const n = Number(v);
        return Number.isNaN(n) ? undefined : n;
    }

    _schedulePush = (slug, hint) => {
        if (!slug) return;
        if (
            hint?.invVersion != null &&
            !Number.isNaN(Number(hint.invVersion))
        ) {
            const cur = this.latestInvVersion.get(slug);
            const next = Math.max(
                Number(cur ?? -Infinity),
                Number(hint.invVersion),
            );
            this.latestInvVersion.set(slug, next);
        }
        if (this.pending.has(slug)) return;

        const t = setTimeout(async () => {
            this.pending.delete(slug);
            const sinks = this.sinks.get(slug);
            if (!sinks || sinks.size === 0) return;

            const effInv =
                this._parseInvVersion(this.latestInvVersion.get(slug)) ??
                this._parseInvVersion(hint?.invVersion);

            let snap;
            try {
                snap = await this.availability.getBySlug(slug, {
                    minInvVersion: effInv,
                    forceRefresh: !!hint?.forceRefresh, // bật trong DEV nếu cần
                });
            } catch (e) {
                this.logger.warn("[Broadcaster] snapshot failed", {
                    slug,
                    err: e?.message,
                });
                return;
            }
            if (!snap || snap.status !== 200) return;

            this.logger.info("[push.check]", {
                slug,
                status: snap?.status,
                etag: snap?.etag,
                cacheHit: !!snap?._cacheHit,
                sinks: sinks.size,
            });

            const payloadStr = JSON.stringify(snap);
            for (const res of [...sinks]) {
                try {
                    const last = this.lastEtag.get(res);
                    if (snap.etag && last === snap.etag) continue; // ✅ dedup

                    if (snap.etag) {
                        this.lastEtag.set(res, snap.etag);
                        res.write(`id: ${snap.etag}\n`);
                    }
                    res.write(`event: update\n`);
                    res.write(`data: ${payloadStr}\n\n`);
                } catch {
                    // client đóng kết nối
                    try {
                        res.end();
                    } catch {}
                    sinks.delete(res);
                    this.lastEtag.delete(res);
                }
            }

            if (sinks.size === 0) {
                this.sinks.delete(slug);
                this.latestInvVersion.delete(slug);
            }
        }, this.coalesceMs);

        this.pending.set(slug, t);
    };

    async start() {
        await this.sub.connect?.();

        await this.sub.psubscribe(
            "availability:slug:*",
            async ({ channel, message }) => {
                try {
                    const payload = JSON.parse(message || "{}");
                    const parts = String(channel).split(":"); // ["availability","slug","<slug>"]
                    const slug = payload.slug || parts[2];
                    const invVersion = this._parseInvVersion(
                        payload?.invVersion,
                    );

                    if (!Number.isNaN(invVersion) && invVersion != null) {
                        this.latestInvVersion.set(slug, invVersion);
                    }

                    this.logger.info("[sub.avail]", {
                        channel,
                        resolvedSlug: slug,
                        invVersion,
                        sinks: this.sinks.get(slug)?.size ?? 0,
                        payloadKeys: Object.keys(payload || {}),
                    });

                    if (!slug) return;
                    const sinks = this.sinks.get(slug);
                    if (!sinks || sinks.size === 0) return;

                    this._schedulePush(slug, { invVersion });
                } catch (e) {
                    this.logger.warn(
                        "[Broadcaster] psubscribe handler failed",
                        { err: e?.message },
                    );
                }
            },
        );

        this.logger.info("[Broadcaster] Subscribed availability:slug:*");
    }

    sseHandler = async (req, res) => {
        const slug = String(req.params.slug || req.query.slug || "").trim();
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
            try {
                res.end();
            } catch {}
            return;
        }
        sinks.add(res);

        const lastId = req.get?.("Last-Event-ID");
        if (lastId) {
            this.lastEtag.set(res, lastId);
        }

        const hb = setInterval(() => {
            try {
                res.write(`event: ping\ndata: {}\n\n`);
            } catch {}
        }, 25_000);

        const hintInv = this.latestInvVersion.get(slug);
        this._schedulePush(slug, { invVersion: hintInv });

        const onClose = () => {
            clearInterval(hb);
            const set = this.sinks.get(slug);
            set?.delete(res);
            if (set && set.size === 0) {
                this.sinks.delete(slug);
                this.latestInvVersion.delete(slug);
            }

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
