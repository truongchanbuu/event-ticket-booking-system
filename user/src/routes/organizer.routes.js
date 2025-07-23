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
            "/organizers/public",
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.organizerController.getPublicOrganizers,
        );
        this.router.get(
            "/organizers/:orgID",
            this.organizerController.getOrganizerProfile,
        );
        this.router.post(
            "/organizers/apply",
            verifyToken,
            OrganizerValidator.validateEventOrgApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.applyOrganizer,
        );
        this.router.get(
            "/me/applications",
            verifyToken,
            this.organizerController.getMyApplications,
        );
        this.router.get(
            "/me/applications/:applicationID",
            verifyToken,
            this.organizerController.getMyApplicationDetail,
        );
        this.router.post(
            "/me/applications/:applicationID",
            verifyToken,
            this.organizerController.updateMyApplication,
        );
        this.router.delete(
            "/me/applications/:applicationID",
            verifyToken,
            OrganizerValidator.validateDeleteApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.cancelMyApplication,
        );
        this.router.post(
            "/me/:applicationID/deactivate",
            verifyToken,
            this.organizerController.deactivateOrganizer,
        );

        // admin-access
        this.router.get(
            "/organizers",
            verifyToken,
            checkAdmin,
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.organizerController.getOrganizers,
        );
        this.router.get(
            "/organizers/applications",
            verifyToken,
            checkAdmin,
            this.organizerController.getAllApplications,
        );
        this.router.get(
            "/organizers/applications/:applicationID",
            verifyToken,
            checkAdmin,
            this.organizerController.getApplicationByID,
        );
        this.router.put(
            "/organizers/applications/:applicationID",
            verifyToken,
            checkAdmin,
            OrganizerValidator.validateUpdateApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.updateApplication,
        );
        this.router.delete(
            "/organizers/applications/:applicationID",
            verifyToken,
            checkAdmin,
            OrganizerValidator.validateDeleteApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.deleteApplication,
        );
        this.router.patch(
            "/organizers/:applicationID/status",
            verifyToken,
            checkAdmin,
            this.organizerController.checkApplication,
        );
    }

    get organizerRouter() {
        return this.router;
    }
}
