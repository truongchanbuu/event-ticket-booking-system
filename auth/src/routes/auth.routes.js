import express from "express";
import AuthValidator from "../middlewares/validator.js";
import {
    verifyToken,
    checkAdmin,
    checkOwnerOrAdmin,
} from "@event_ticket_booking_system/shared";

export class AuthRoutes {
    constructor({ authController }) {
        this.router = express.Router();
        this.authController = authController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.post(
            "/verify-token",
            verifyToken,
            this.authController.verifyToken,
        );
        this.router.post(
            "/verify-session",
            this.authController.verifySessionCookies,
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
        this.router.post(
            "/session",
            verifyToken,
            this.authController.createSession,
        );
        this.router.delete(
            "/:uid",
            verifyToken,
            checkOwnerOrAdmin,
            AuthValidator.validateDeleteUser(),
            AuthValidator.handleValidationErrors,
        );
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
}
