import express from "express";
import {
    checkAdmin,
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
        this.router.post(
            "/",
            UserValidator.validateRegister(),
            UserValidator.handleValidationErrors,
            this.userController.registerUser,
        );
    }

    get userRouter() {
        return this.router;
    }
}
