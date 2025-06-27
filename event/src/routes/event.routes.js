import express from "express";
import { checkAdmin, verifyToken } from "@event_ticket_booking_system/shared";
import EventValidator from "../middlewares/validator.js";

export default class EventRoutes {
    constructor({ eventController }) {
        this.router = express.Router();
        this.eventController = eventController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/me/events",
            verifyToken,
            this.eventController.getMyEvents,
        );
        this.router.get(
            "/me/events/:eventID",
            verifyToken,
            EventValidator.validateGetMyEvent(),
            EventValidator.handleValidationErrors,
            this.eventController.getMyEventByID,
        );
        this.router.post(
            "/me/events",
            verifyToken,
            EventValidator.createEventValidation(),
            EventValidator.handleValidationErrors,
            this.eventController.createEvent,
        );

        // TODO: SETUP KAFKA CONSUMER FOR TICKET UPDATED/CREATED + CONTINUE UPDATING EVENT
        this.router.put(
            "/me/events/:eventID",
            verifyToken,
            EventValidator.validateUpdateMyEvent(),
            EventValidator.handleValidationErrors,
            this.eventController.updateMyEvent,
        );
        this.router.delete("/me/events/:eventID", verifyToken);

        // admin-access
        this.router.get("/events", verifyToken, checkAdmin);
    }

    get eventRouter() {
        return this.router;
    }
}
