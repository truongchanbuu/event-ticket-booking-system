import express from "express";
import { TicketValidator } from "../middlewares/ticket.validator.js";
import { verifyToken } from "@event_ticket_booking_system/shared";

export class TicketRoutes {
    constructor({ ticketController }) {
        this.router = express.Router();
        this.ticketController = ticketController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/:eventID",
            verifyToken,
            TicketValidator.validateGetTicketType,
            TicketValidator.handleValidationErrors,
            this.ticketController.getEventTicketTypes,
        );

        this.router.put(
            "/:ticketTypeID",
            verifyToken,
            TicketValidator.validateUpdateTicketType,
            TicketValidator.handleValidationErrors,
            this.ticketController.updateTicket,
        );

        this.router.post(
            "/",
            verifyToken,
            TicketValidator.createTicketValidator,
            TicketValidator.handleValidationErrors,
            this.ticketController.createTicket,
        );
    }
}
