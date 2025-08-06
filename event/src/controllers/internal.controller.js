import { catchAsync } from "@event_ticket_booking_system/shared";

export class InternalController {
    constructor({ eventService }) {
        this.eventService = eventService;
        this.getEventOrganizerID = catchAsync(
            this.getEventOrganizerID.bind(this),
        );
    }

    async getEventOrganizerID(req, res) {
        const { eventID } = req.params;
        const result = await this.eventService.getEventByID(eventID);
        console.log(`RES: ${JSON.stringify(result)}`);

        return res.status(200).json({
            success: true,
            data: result.organizer.organizerID,
        });
    }
}
