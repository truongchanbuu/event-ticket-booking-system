import express from "express";
import { verifyToken } from "@event_ticket_booking_system/shared";
import EventValidator from "../middlewares/validator.js";

export class ProfileRoutes {
    constructor({ eventController }) {
        this.router = express.Router();
        this.eventController = eventController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/events",
            verifyToken,
            this.eventController.getMyEvents,
        );
        this.router.get(
            "/events/:eventID",
            verifyToken,
            EventValidator.validateGetMyEvent(),
            EventValidator.handleValidationErrors,
            this.eventController.getMyEventByID,
        );

        this.router.put(
            "/events/:eventID",
            verifyToken,
            EventValidator.validateUpdateMyEvent(),
            EventValidator.handleValidationErrors,
            this.eventController.updateMyEvent,
        );

        this.router.post(
            "/events/:eventID/cancel",
            verifyToken,
            EventValidator.validateCancelEvent(),
            EventValidator.handleValidationErrors,
            this.eventController.cancelMyEvent,
        );

        this.router.delete("/events/:eventID", verifyToken);

        this.router.post(
            "/events",
            verifyToken,
            EventValidator.createEventValidation(),
            EventValidator.handleValidationErrors,
            this.eventController.createEvent,
        );
    }
}
