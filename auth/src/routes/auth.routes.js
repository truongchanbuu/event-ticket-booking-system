import express from "express";
import AuthValidator from "../utils/validator.js";
import {
    checkAdmin,
    checkOwnerOrAdmin,
    verifyToken,
} from "../middlewares/firebase_auth.middleware.js";

export default class AuthRoutes {
    constructor({ authController }) {
        this.router = express.Router();
        this.authController = authController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.post(
            "/validate-token",
            verifyToken,
            this.authController.validateToken,
        );
        this.router.post(
            "/revoke-token",
            verifyToken,
            checkOwnerOrAdmin,
            AuthValidator.validateRevokeToken(),
            AuthValidator.handleValidationErrors,
            this.authController.revokeToken,
        );
        this.router.post("/logout", verifyToken, this.authController.logout);

        this.router.get(
            "/claims/:uid",
            verifyToken,
            checkOwnerOrAdmin,
            AuthValidator.validateGetClaims(),
            AuthValidator.handleValidationErrors,
            this.authController.getClaims,
        );
        this.router.post(
            "/claims/:uid",
            verifyToken,
            checkAdmin,
            AuthValidator.validateSetClaims(),
            AuthValidator.handleValidationErrors,
            this.authController.setClaims,
        );
    }

    get authRouter() {
        return this.router;
    }
}
