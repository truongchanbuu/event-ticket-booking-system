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
        // profile
        this.router.get("/me", verifyToken, this.userController.getProfile);
        this.router.put(
            "/me",
            verifyToken,
            UserValidator.validateUpdateUser(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.delete(
            "/me",
            UserValidator.validateDeleteUser(),
            UserValidator.handleValidationErrors,
            this.userController.softDeleteUser,
        );
        this.router.post(
            "/me/followed-organizers",
            verifyToken,
            UserValidator.validateFollowedOrganizer(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.post(
            "/me/notifications",
            verifyToken,
            UserValidator.validateNotification(),
            UserValidator.handleValidationErrors,
            this.userController.updateNotifications,
        );
        this.router.put(
            "/me/notifications/:notificationID/status",
            verifyToken,
            UserValidator.validateUpdateNotificationStatus(),
            UserValidator.handleValidationErrors,
            this.userController.updateNotificationStatus,
        );

        // admin-access
        this.router.get(
            "/users",
            verifyToken,
            checkAdmin,
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.userController.getUsers,
        );
        this.router.get(
            "/users/:userID",
            verifyToken,
            checkAdmin,
            this.userController.getProfile,
        );
        this.router.post(
            "/users",
            UserValidator.validateCreateUser(),
            UserValidator.handleValidationErrors,
            this.userController.registerUser,
        );
        this.router.put(
            "/users/:userID",
            verifyToken,
            checkAdmin,
            UserValidator.validateUpdateUser(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.delete(
            "/users/:userID",
            verifyToken,
            checkAdmin,
            UserValidator.validateDeleteUser(),
            UserValidator.handleValidationErrors,
            this.userController.deleteUser,
        );
    }

    get userRouter() {
        return this.router;
    }
}
