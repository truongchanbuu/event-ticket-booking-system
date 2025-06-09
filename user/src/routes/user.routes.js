import express from "express";
import {
    checkAdmin,
    verifyToken,
} from "../middlewares/firebase_auth.middleware";
import UserValidator from "../utils/validator";

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
            UserValidator.validateGetUsers,
            this.userController.getAllUsers(),
        );
    }
}
