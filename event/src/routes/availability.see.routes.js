import { Router } from "express";

export class AvailabilitySSERoutes {
    constructor({ broadcaster }) {
        this.router = Router();
        this.router.get(
            "/events/:id/availability/stream",
            broadcaster.sseHandler,
        );
    }
}
