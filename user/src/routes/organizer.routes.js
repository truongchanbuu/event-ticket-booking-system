import express from "express";
import OrganizerValidator from "../middlewares/organizer.validator.js";
import UserValidator from "../middlewares/user.validator.js";
import { checkAdmin, verifyToken } from "@event_ticket_booking_system/shared";

export default class OrganizerRoutes {
    constructor({ organizerController }) {
        this.router = express.Router();
        this.organizerController = organizerController;
        this.initRoutes();
    }

    initRoutes() {
        // public
        this.router.get(
            "/public",
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.organizerController.getPublicOrganizers,
        );
        this.router.post(
            "/apply",
            verifyToken,
            OrganizerValidator.validateEventOrgApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.applyOrganizer,
        );

        // admin-access
        this.router.get(
            "/applications",
            verifyToken,
            checkAdmin,
            OrganizerValidator.validateGetAllApplications(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.getAllApplications,
        );
        this.router.get(
            "/applications/:applicationID",
            verifyToken,
            checkAdmin,
            this.organizerController.getApplicationByID,
        );
        this.router.put(
            "/applications/:applicationID",
            verifyToken,
            checkAdmin,
            OrganizerValidator.validateUpdateApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.updateApplication,
        );
        this.router.delete(
            "/applications/:applicationID",
            verifyToken,
            checkAdmin,
            OrganizerValidator.validateDeleteApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.deleteApplication,
        );

        this.router.get(
            "/:orgID",
            this.organizerController.getOrganizerProfile,
        );
        this.router.patch(
            "/:applicationID/status",
            verifyToken,
            checkAdmin,
            this.organizerController.checkApplication,
        );

        this.router.get(
            "/",
            verifyToken,
            checkAdmin,
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.organizerController.getOrganizers,
        );
    }

    get organizerRouter() {
        return this.router;
    }
}
