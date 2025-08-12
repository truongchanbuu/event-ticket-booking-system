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

    async getAggregate(req, res) {
        const ttId = req.params.ttId.trim();
        const eventId = req.query.eventId?.toString();
        try {
            const { remains, invVersion } =
                await this.inventoryService.readAggregatedCountersWithVersion(
                    eventId,
                    [ttId],
                );
            return res.json({
                ok: true,
                remaining: remains[0] ?? 0,
                invVersion,
            });
        } catch (e) {
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        }
    }

    async reserveTicket(req, res) {
        const ttId = req.params.ttId.trim();
        const { qty, eventId, hint, slug } = req.body;

        try {
            const r = await this.inventoryService.reserve(ttId, Number(qty), {
                eventId,
                slug,
                affinityKey: hint,
            });

            if (r?.ok) {
                return res.status(200).json({
                    ok: true,
                    shardIndex: r.shardIndex,
                    newRemaining: r.newRemaining,
                    version: r.version ?? 0,
                });
            }
            return res.status(409).json({
                ok: false,
                error: "INSUFFICIENT_STOCK",
                currentRemaining: r?.currentRemaining ?? undefined,
            });
        } catch (e) {
            console.error("[internal.reserve] error", { ttId, e: e?.message });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        }
    }

    async releaseTicket(req, res) {
        const ttId = req.params.ttId.trim();
        const { qty, shardIndex, eventId, slug } = req.body;

        try {
            const r = await this.inventoryService.release(ttId, Number(qty), {
                eventId,
                slug,
                shardIndex: Number(shardIndex),
            });
            if (r?.ok) {
                return res.status(200).json({
                    ok: true,
                    newRemaining: r.newRemaining,
                    version: r.version ?? 0,
                });
            }
            return res.status(500).json({ ok: false, error: "RELEASE_FAILED" });
        } catch (e) {
            console.error("[internal.release] error", { ttId, e: e?.message });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        }
    }
}
