import express from "express";
import {
    checkAdmin,
    checkOwnerOrAdmin,
    verifyToken,
} from "@event_ticket_booking_system/shared";
import EventValidator from "../middlewares/validator.js";

export class EventRoutes {
    constructor({ eventController, availabilityController }) {
        this.router = express.Router();
        this.eventController = eventController;
        this.availabilityController = availabilityController;
        this.initRoutes();
    }

    initRoutes() {
        // ===== Public =====
        // this.router.get(
        //     "/availability",
        //     this.availabilityController.getAvailabilityBySlug,
        // );

        this.router.get(
            "/:eventID/tickets",
            this.eventController.getEventTicketTypes,
        );

        this.router.get(
            "/:eventID/contributors",
            this.eventController.getEventContributors,
        );

        // ===== Authenticated (generic) =====
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

        // ===== Contributors management =====
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

        this.router.get("/:slug", this.eventController.getPublicEventDetail);

        this.router.get(["", "/"], this.eventController.getPublicEvents);

        // ===== Privileged actions (owner/admin) =====
        this.router.post(
            "/:eventID/publish",
            verifyToken,
            checkOwnerOrAdmin,
            EventValidator.validatePublishEvent(),
            EventValidator.handleValidationErrors,
            this.eventController.publishEvent,
        );
    }
}
