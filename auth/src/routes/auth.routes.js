import express from "express";
import AuthValidator from "../middlewares/validator.js";
import {
    verifyToken,
    checkAdmin,
    checkOwnerOrAdmin,
} from "@event_ticket_booking_system/shared";

export default class AuthRoutes {
    constructor({ authController }) {
        this.router = express.Router();
        this.authController = authController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.post(
            "/auth/validate-token",
            verifyToken,
            this.authController.validateToken,
        );
        this.router.post(
            "/auth/revoke-token",
            verifyToken,
            checkOwnerOrAdmin,
            AuthValidator.validateRevokeToken(),
            AuthValidator.handleValidationErrors,
            this.authController.revokeToken,
        );
        this.router.post(
            "/auth/logout",
            verifyToken,
            this.authController.logout,
        );

        this.router.delete(
            "/auth/:uid",
            verifyToken,
            checkOwnerOrAdmin,
            AuthValidator.validateDeleteUser(),
            AuthValidator.handleValidationErrors,
        );

        this.router.get(
            "/auth/claims/:uid",
            verifyToken,
            checkOwnerOrAdmin,
            AuthValidator.validateGetClaims(),
            AuthValidator.handleValidationErrors,
            this.authController.getClaims,
        );
        this.router.post(
            "/auth/claims/:uid",
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
