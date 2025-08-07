import express from "express";

export class ApiRoutes {
    constructor({ ticketRoutes, internalRoutes }) {
        this.router = express.Router();
        this.router.use("/tickets", ticketRoutes.router);
        this.router.use("/internal", internalRoutes.router);
    }
}
