import express from "express";

export class ApiRoutes {
    constructor({ eventRoutes, profileRoutes, internalRoutes }) {
        this.router = express.Router();
        this.router.use("/events", eventRoutes.router);
        this.router.use("/me", profileRoutes.router);
        this.router.use("/internal", internalRoutes.router);
    }
}
