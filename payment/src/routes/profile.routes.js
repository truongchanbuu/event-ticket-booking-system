import { verifyToken } from "@event_ticket_booking_system/shared";
import express from "express";
import { PaymentValidator } from "../middlewares/payment.validator.js";

export class ProfileRoutes {
    constructor({ paymentController }) {
        this.router = express.Router();
        this.paymentController = paymentController;
        this.initRoutes();
    }

    initRoutes() {
        this.router.get(
            "/methods",
            verifyToken,
            this.paymentController.getUserPaymentMethods,
        );

        this.router.post(
            "/methods",
            verifyToken,
            PaymentValidator.validateCreatePaymentMethod,
            this.paymentController.createPaymentMethod,
        );

        this.router.put(
            "/methods/:paymentMethodID",
            verifyToken,
            PaymentValidator.validateUpdatePaymentMethod,
            this.paymentController.updatePaymentMethod,
        );

        this.router.delete(
            "/methods/:paymentMethodID",
            verifyToken,
            PaymentValidator.validateDeletePaymentMethod,
            this.paymentController.deletePaymentMethod,
        );
    }
}
