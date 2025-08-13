import { Router } from "express";

export class PaymentRoutes {
    constructor({ paymentController }) {
        this.router = Router();

        // 1) Webhook IPN (mock & merchant dùng chung)
        this.router.post("/payment/momo/ipn", paymentController.ipnMomo);

        // 2) Simulator (demo/dev) — có thể hạn chế quyền qua middleware
        this.router.post(
            "/_simulator/payments/momo",
            paymentController.simulateMomoIpn,
        );
    }
}
