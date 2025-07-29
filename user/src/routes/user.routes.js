import express from "express";
import UserValidator from "../middlewares/user.validator.js";
import { checkAdmin, verifyToken } from "@event_ticket_booking_system/shared";

export default class UserRoutes {
    constructor({ userController }) {
        this.router = express.Router();
        this.userController = userController;
        this.initRoutes();
    }

    initRoutes() {
        // admin-access
        this.router.get(
            "/",
            verifyToken,
            checkAdmin,
            UserValidator.validateGetUsers(),
            UserValidator.handleValidationErrors,
            this.userController.getUsers,
        );
        this.router.get(
            "/:userID",
            verifyToken,
            checkAdmin,
            this.userController.getProfile,
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
            checkAdmin,
            UserValidator.validateUpdateUser(),
            UserValidator.handleValidationErrors,
            this.userController.updateUser,
        );
        this.router.delete(
            "/:userID",
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
