import express from "express";

export class ApiRoutes {
    constructor({ ticketRoutes }) {
        this.router = express.Router();
        this.router.use("/tickets", ticketRoutes.router);
    }
}
