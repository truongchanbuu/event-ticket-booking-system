import express from "express";
import { checkAdmin, verifyToken } from "@event_ticket_booking_system/shared";
import EventValidator from "../middlewares/validator.js";

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
        this.router.post(
            "/:eventID/attendees",
            verifyToken,
            this.eventController.createAttendee,
        );

        this.router.get(
            "/:eventID/tickets",
            this.eventController.getEventTicketTypes,
        );

        this.router.post(
            "/:eventID/contributors",
            verifyToken,
            EventValidator.validateCreateContributor(),
            EventValidator.handleValidationErrors,
            this.eventController.createContributor,
        );

        this.router.put(
            "/:eventID/contributors/:contributorID",
            verifyToken,
            EventValidator.validateUpdateContributor(),
            EventValidator.handleValidationErrors,
            this.eventController.updateContributor,
        );
        this.router.delete(
            "/:eventID/contributors/:contributorID",
            verifyToken,
            EventValidator.validateRemoveContributor(),
            EventValidator.handleValidationErrors,
            this.eventController.removeContributor,
        );
        this.router.get(
            "/:eventID/contributors",
            this.eventController.getEventContributors,
        );
    }
}
