import { catchAsync } from "@event_ticket_booking_system/shared";
import { EVENT_STATUS } from "../enums/event-status.js";

export class InternalController {
    constructor({ eventService }) {
        this.eventService = eventService;
        this.getEventOrganizerID = catchAsync(
            this.getEventOrganizerID.bind(this),
        );
        this.getPublishedEventIds = catchAsync(
            this.getPublishedEventIds.bind(this),
        );
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
}
