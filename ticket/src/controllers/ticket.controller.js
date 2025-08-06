import { catchAsync } from "@event_ticket_booking_system/shared";

export class TicketController {
    constructor({ ticketService, internalService }) {
        this.ticketService = ticketService;
        this.internalService = internalService;

        this.createTicket = catchAsync(this.createTicket.bind(this));
        this.updateTicket = catchAsync(this.updateTicket.bind(this));
        this.getEventTicketTypes = catchAsync(
            this.getEventTicketTypes.bind(this),
        );
    }

    async getEventTicketTypes(req, res) {
        const userID = req.user.uid;
        const { eventID } = req.params;
        const isAuthorized = await this.internalService.isEventOrganizer(
            eventID,
            userID,
        );

        if (!isAuthorized) {
            return res
                .status(403)
                .json({ error: "Forbidden: Not event owner." });
        }

        const results = await this.ticketService.getTicketTypesByEvent(eventID);

        return res.status(200).json({ success: true, data: results });
    }

    async createTicket(req, res) {
        const userID = req.user.uid;
        const isAuthorized = await this.internalService.isEventOrganizer(
            req.body.eventID,
            userID,
        );

        if (!isAuthorized) {
            return res
                .status(403)
                .json({ error: "Forbidden: Not event owner." });
        }

        const ticketTypeID = await this.ticketService.findOrCreateTicketType(
            req.body,
        );
        console.log(`[CONTROLLER] = TICKET TYPE: ${ticketTypeID}`);
        return res.status(200).json({
            success: true,
            data: ticketTypeID,
            message: "Ticket type created.",
        });
    }

    async updateTicket(req, res) {
        console.log("params:", req.params); // 👈 Xem có ticketTypeID không
        console.log("body:", req.body);
        const userID = req.user.uid;
        const isAuthorized = await this.internalService.isEventOrganizer(
            req.body.eventID,
            userID,
        );

        if (!isAuthorized) {
            return res
                .status(403)
                .json({ error: "Forbidden: Not event owner." });
        }

        const ticketTypeID = req.body.ticketTypeID;
        const updatedTicketTypeID = await this.ticketService.updateTicketType(
            ticketTypeID,
            req.body,
        );

        return res.status(200).json({
            success: true,
            data: updatedTicketTypeID,
            message: "Ticket type created.",
        });
    }
}
