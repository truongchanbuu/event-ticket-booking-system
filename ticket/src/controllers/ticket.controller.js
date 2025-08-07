import { catchAsync } from "@event_ticket_booking_system/shared";

export class TicketController {
    constructor({ ticketService, eventClientService }) {
        this.ticketService = ticketService;
        this.eventClientService = eventClientService;

        this.createTicket = catchAsync(this.createTicket.bind(this));
        this.updateTicket = catchAsync(this.updateTicket.bind(this));
        this.getEventTicketTypes = catchAsync(
            this.getEventTicketTypes.bind(this),
        );
        this.deleteTicket = catchAsync(this.deleteTicket.bind(this));
    }

    async getEventTicketTypes(req, res) {
        const userID = req.user.uid;
        const { eventID } = req.params;
        const isAuthorized = await this.eventClientService.isEventOrganizer(
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
        const isAuthorized = await this.eventClientService.isEventOrganizer(
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
        const userID = req.user.uid;
        const ticketTypeID = req.params.ticketTypeID;

        const ticketToAuth =
            await this.ticketService.getTicketForAuth(ticketTypeID);

        if (!ticketToAuth) {
            return res
                .status(404)
                .json({ success: false, message: "Ticket type not found." });
        }

        const isAuthorized = await this.eventClientService.isEventOrganizer(
            ticketToAuth.eventID,
            userID,
        );

        if (!isAuthorized) {
            return res
                .status(403)
                .json({ error: "Forbidden: Not event owner." });
        }

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

    async deleteTicket(req, res) {
        const userID = req.user.uid;
        const { ticketTypeID } = req.params;

        const ticketToAuth =
            await this.ticketService.getTicketForAuth(ticketTypeID);

        if (!ticketToAuth) {
            return res
                .status(404)
                .json({ success: false, message: "Ticket type not found." });
        }

        const isAuthorized = await this.eventClientService.isEventOrganizer(
            ticketToAuth.eventID,
            userID,
        );

        if (!isAuthorized) {
            return res.status(403).json({
                error: "Forbidden: You are not the organizer for this ticket's event.",
            });
        }

        await this.ticketService.deleteTicketType(ticketTypeID);

        return res.status(200).json({
            success: true,
            message: "Ticket type deleted successfully.",
        });
    }
}
