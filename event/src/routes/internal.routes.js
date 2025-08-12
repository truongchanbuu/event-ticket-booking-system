import { verifyApiToken } from "@event_ticket_booking_system/shared";
import express from "express";
import { ReservationValidator } from "../middlewares/reservation.validator.js";

export class InternalRoutes {
    constructor({ internalController }) {
        this.router = express.Router();
        this.internalController = internalController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/events/:eventID/get-organizer-id",
            verifyApiToken,
            this.internalController.getEventOrganizerID,
        );

        this.router.get(
            "/events/ids",
            verifyApiToken,
            this.internalController.getPublishedEventIds,
        );

        // Inventory
        this.router.get(
            "/inventory/:ttId/aggregate",
            verifyApiToken,
            ReservationValidator.validateGetAggregate(),
            ReservationValidator.handleValidationErrors,
            this.internalController.getAggregate,
        );

        this.router.post(
            "/inventory/:ttId/reserve",
            verifyApiToken,
            ReservationValidator.validateReservation(),
            ReservationValidator.handleValidationErrors,
            this.internalController.reserveTicket,
        );

        this.router.post(
            "/inventory/:ttId/release",
            verifyApiToken,
            ReservationValidator.validateReleaseReservation(),
            ReservationValidator.handleValidationErrors,
            this.internalController.releaseTicket,
        );
    }
}
