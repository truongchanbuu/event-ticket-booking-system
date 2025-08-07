import { verifyApiToken } from "@event_ticket_booking_system/shared";
import express from "express";
import { TicketInternalValidator } from "../middlewares/internal.validator.js";

export class InternalRoutes {
    constructor({ internalController }) {
        this.router = express.Router();
        this.internalController = internalController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/tickets/:eventID",
            verifyApiToken,
            TicketInternalValidator.validateGetTicketTypes,
            TicketInternalValidator.handleValidationErrors,
            this.internalController.getTicketTypes,
        );
    }
}
