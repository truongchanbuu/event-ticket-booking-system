import { verifyApiToken } from "@event_ticket_booking_system/shared";
import express from "express";

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
    }
}
