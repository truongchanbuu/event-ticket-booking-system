import express from "express";
import {
    checkAdmin,
    checkOwnerOrAdmin,
    verifyToken,
} from "../middlewares/firebase_auth.middleware.js";
import UserValidator from "../utils/validator.js";

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
        // this.router.delete(
        //     "/:userID",
        //     verifyToken,
        //     checkOwnerOrAdmin,
        //     UserValidator.validateDeleteUser,
        //     UserValidator.handleValidationErrors,
        //     this.userController.deleteUser,
        // );
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
