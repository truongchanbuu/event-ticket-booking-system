import { catchAsync } from "@event_ticket_booking_system/shared";

export class InternalController {
    constructor({ eventService, inventoryService }) {
        this.eventService = eventService;
        this.inventoryService = inventoryService;

        this.getEventOrganizerID = catchAsync(
            this.getEventOrganizerID.bind(this),
        );
        this.getPublishedEventIds = catchAsync(
            this.getPublishedEventIds.bind(this),
        );

        this.getAggregate = catchAsync(this.getAggregate.bind(this));
        this.reserveTicket = catchAsync(this.reserveTicket.bind(this));
        this.releaseTicket = catchAsync(this.releaseTicket.bind(this));
    }

    async getEventOrganizerID(req, res) {
        const { eventID } = req.params;
        const result = await this.eventService.getEventByID(eventID);

        return res.status(200).json({
            success: true,
            data: result.organizer.organizerID,
        });
    }

    async getPublishedEventIds(req, res) {
        try {
            const eventIDs = await this.eventService.getPublishedEventIds();
            return res.status(200).json({ eventIDs, total: eventIDs.length });
        } catch (err) {
            console.error("[getPublishedEventIds] error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    // GET /internal/inventory/:ttId/aggregate?eventId=...
    async getAggregate(req, res) {
        const ttId = String(req.params.ttId || "").trim();
        const eventId = req.query.eventId
            ? String(req.query.eventId)
            : undefined;

        if (!ttId) {
            return res
                .status(400)
                .json({ ok: false, error: "INVALID_TICKET_TYPE" });
        }

        try {
            const { remains, invVersion } =
                await this.inventoryService.readAggregatedCountersWithVersion(
                    eventId,
                    [ttId],
                );

            return res.status(200).json({
                ok: true,
                remaining: remains[0] ?? 0,
                invVersion,
            });
        } catch (e) {
            const msg = String(e?.message || "");
            // TT chưa seed / thiếu meta
            if (msg.includes("meta missing shardCount")) {
                return res
                    .status(404)
                    .json({ ok: false, error: "TICKET_TYPE_NOT_SEEDED" });
            }
            this.logger?.error?.("[internal.aggregate] error", {
                ttId,
                e: msg,
            });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        }
    }

    // POST /internal/inventory/:ttId/reserve
    // body: { qty:number, eventId?:string, slug?:string, affinityKey?:string, hint?:any }
    async reserveTicket(req, res) {
        const ttId = String(req.params.ttId || "").trim();
        const { qty, eventId, slug, affinityKey, hint } = req.body || {};
        console.log(`TTID: ${ttId} - ${JSON.stringify(req.body)}`);

        const nqty = Number(qty);
        const aff = affinityKey ?? hint ?? undefined;

        if (!ttId) {
            return res
                .status(400)
                .json({ ok: false, error: "INVALID_TICKET_TYPE" });
        }
        if (!Number.isInteger(nqty) || nqty <= 0) {
            return res.status(400).json({ ok: false, error: "INVALID_QTY" });
        }

        try {
            const r = await this.inventoryService.reserve(ttId, nqty, {
                eventId,
                slug,
                affinityKey: aff,
            });

            if (r?.ok) {
                return res.status(200).json({
                    ok: true,
                    shardIndex: r.shardIndex,
                    newRemaining: r.newRemaining,
                    version: r.version ?? 0,
                });
            }

            console.log(`result: ${JSON.stringify(r)}`);
            return res.status(409).json({
                ok: false,
                error: "INSUFFICIENT_STOCK",
                currentRemaining: r?.currentRemaining ?? undefined,
            });
        } catch (e) {
            const msg = String(e?.message || "");
            // TT chưa seed / thiếu meta
            if (msg.includes("meta missing shardCount")) {
                return res
                    .status(404)
                    .json({ ok: false, error: "TICKET_TYPE_NOT_SEEDED" });
            }
            this.logger?.error?.("[internal.reserve] error", { ttId, e: msg });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        }
    }

    // POST /internal/inventory/:ttId/release
    // body: { qty:number, shardIndex:number, eventId?:string, slug?:string }
    async releaseTicket(req, res) {
        const ttId = String(req.params.ttId || "").trim();
        const { qty, shardIndex, eventId, slug } = req.body || {};

        const nqty = Number(qty);
        const sidx = Number(shardIndex);

        if (!ttId) {
            return res
                .status(400)
                .json({ ok: false, error: "INVALID_TICKET_TYPE" });
        }
        if (!Number.isInteger(nqty) || nqty <= 0) {
            return res.status(400).json({ ok: false, error: "INVALID_QTY" });
        }
        if (!Number.isInteger(sidx)) {
            return res
                .status(400)
                .json({ ok: false, error: "SHARD_INDEX_REQUIRED" });
        }

        try {
            const r = await this.inventoryService.release(ttId, nqty, {
                eventId,
                slug,
                shardIndex: sidx,
            });

            if (r?.ok) {
                return res.status(200).json({
                    ok: true,
                    newRemaining: r.newRemaining,
                    version: r.version ?? 0,
                });
            }

            // Không release được (ví dụ shard value không đủ, hoặc logic lua trả fail)
            return res.status(409).json({ ok: false, error: "RELEASE_FAILED" });
        } catch (e) {
            const msg = String(e?.message || "");
            if (msg.includes("shardIndex is required")) {
                return res
                    .status(400)
                    .json({ ok: false, error: "SHARD_INDEX_REQUIRED" });
            }
            if (msg.includes("meta missing shardCount")) {
                return res
                    .status(404)
                    .json({ ok: false, error: "TICKET_TYPE_NOT_SEEDED" });
            }
            this.logger?.error?.("[internal.release] error", { ttId, e: msg });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        }
    }
}
