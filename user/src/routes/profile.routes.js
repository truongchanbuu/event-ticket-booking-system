import express from "express";
import OrganizerValidator from "../middlewares/organizer.validator.js";
import UserValidator from "../middlewares/user.validator.js";
import { verifyToken } from "@event_ticket_booking_system/shared";

export default class Profileroutes {
    constructor({ userController, organizerController }) {
        this.router = express.Router();
        this.userController = userController;
        this.organizerController = organizerController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get("/", verifyToken, this.userController.getProfile);
        this.router.put(
            "/",
            verifyToken,
            UserValidator.validateSelfUpdate(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.delete(
            "/",
            UserValidator.validateDeleteUser(),
            UserValidator.handleValidationErrors,
            this.userController.softDeleteUser,
        );
        this.router.post(
            "/followed-organizers",
            verifyToken,
            UserValidator.validateFollowedOrganizer(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.post(
            "/notifications",
            verifyToken,
            UserValidator.validateNotification(),
            UserValidator.handleValidationErrors,
            this.userController.updateNotifications,
        );
        this.router.put(
            "/notifications/:notificationID/status",
            verifyToken,
            UserValidator.validateUpdateNotificationStatus(),
            UserValidator.handleValidationErrors,
            this.userController.updateNotificationStatus,
        );
        this.router.get(
            "/applications",
            verifyToken,
            this.organizerController.getMyApplications,
        );
        this.router.get(
            "/applications/:applicationID",
            verifyToken,
            this.organizerController.getMyApplicationDetail,
        );
        this.router.post(
            "/applications/:applicationID",
            verifyToken,
            this.organizerController.updateMyApplication,
        );
        this.router.delete(
            "/applications/:applicationID",
            verifyToken,
            OrganizerValidator.validateDeleteApplication(),
            OrganizerValidator.handleValidationErrors,
            this.organizerController.cancelMyApplication,
        );
        this.router.post(
            "/:applicationID/deactivate",
            verifyToken,
            this.organizerController.deactivateOrganizer,
        );
    }

    get profileRouter() {
        return this.router;
    }
}
