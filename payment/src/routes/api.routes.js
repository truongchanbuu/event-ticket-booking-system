import express from "express";

export class ApiRoutes {
    constructor({ profileRoutes, internalRoutes }) {
        this.router = express.Router();

        this.router.use("/me/payment", profileRoutes.router);
        this.router.use("/internal", internalRoutes.router);
    }
}
