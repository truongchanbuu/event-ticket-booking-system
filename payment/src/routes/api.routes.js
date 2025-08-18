import express from "express";

export class ApiRoutes {
    constructor({
        paymentRoutes,
        profileRoutes,
        internalRoutes,
        paymentIntentRoutes,
    }) {
        this.router = express.Router();

        this.router.use("/me/payment", profileRoutes.router);
        this.router.use("/internal", internalRoutes.router);
        this.router.use("/", paymentIntentRoutes.router);
        this.router.use("/", paymentRoutes.router);
    }
}
