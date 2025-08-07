import { catchAsync } from "@event_ticket_booking_system/shared";

export class InternalController {
    constructor({ ticketService }) {
        this.ticketService = ticketService;
        this.getTicketTypes = catchAsync(this.getTicketTypes.bind(this));
    }

    async getTicketTypes(req, res) {
        const { eventID } = req.params;

        const results = await this.ticketService.getTicketTypesByEvent(eventID);
        return res.status(200).json({ success: true, data: results });
    }
}
