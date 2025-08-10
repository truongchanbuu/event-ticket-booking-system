import { Router } from "express";

export class AvailabilitySSERoutes {
    constructor({ broadcaster }) {
        this.router = Router();

        this.router.get(
            "/:id/availability/stream",
            (req, res, next) => {
                console.log(`COMMING....`);
                next();
            },
            broadcaster.sseHandler,
        );
    }
}
