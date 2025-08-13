import { Router } from "express";
import { PaymentValidator } from "../middlewares/payment.validator.js";
import { verifyApiToken } from "@event_ticket_booking_system/shared";

export class InternalRoutes {
    constructor({ paymentController }) {
        this.router = Router();
        this.paymentController = paymentController;

        this.router.get(
            "/payment/checkout/confirm",
            verifyApiToken,
            PaymentValidator.validateConfirmByIntent,
            this.paymentController.confirm,
        );

        this.router.post(
            "/payment/refund",
            PaymentValidator.validateRefund,
            this.paymentController.refund,
        );
    }
}
