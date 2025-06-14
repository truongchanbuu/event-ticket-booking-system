import express from "express";
import UserValidator from "../utils/validator.js";
import {
    checkAdmin,
    checkOwnerOrAdmin,
    verifyToken,
} from "@event_ticket_booking_system/shared";

export default class UserRoutes {
    constructor({ userController }) {
        this.router = express.Router();
        this.userController = userController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/",
            verifyToken,
            checkAdmin,
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.userController.getAllUser,
        );
        this.router.delete(
            "/:userID",
            verifyToken,
            checkOwnerOrAdmin,
            UserValidator.validateDeleteUser(),
            UserValidator.handleValidationErrors,
            this.userController.softDeleteUser,
        );
        this.router.post(
            "/",
            UserValidator.validateCreateUser(),
            UserValidator.handleValidationErrors,
            this.userController.registerUser,
        );
        this.router.put(
            "/:userID",
            verifyToken,
            checkOwnerOrAdmin,
            UserValidator.validateUpdateUser(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.post(
            "/:userID/followed-organizers",
            verifyToken,
            checkOwnerOrAdmin,
            UserValidator.validateFollowedOrganizer(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.post(
            "/:userID/notifications",
            verifyToken,
            UserValidator.validateNotification(),
            UserValidator.handleValidationErrors,
            this.userController.updateNotifications,
        );
        this.router.put(
            "/:userID/notifications/:notificationID/status",
            verifyToken,
            UserValidator.validateUpdateNotificationStatus(),
            UserValidator.handleValidationErrors,
            this.userController.updateNotificationStatus,
        );
    }

    get userRouter() {
        return this.router;
    }
}
