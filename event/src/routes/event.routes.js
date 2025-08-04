import express from "express";
import { checkAdmin, verifyToken } from "@event_ticket_booking_system/shared";

export class EventRoutes {
    constructor({ eventController }) {
        this.router = express.Router();
        this.eventController = eventController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get("/", verifyToken, checkAdmin);

        this.router.get(
            "/:eventID/attendees",
            verifyToken,
            this.eventController.getEventAttendees,
        );

        this.router.get(
            "/:eventID/tickets",
            verifyToken,
            this.eventController.getEventTicketTypes,
        );
    }
}
