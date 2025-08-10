import { Router } from "express";

export class AvailabilityRoutes {
    constructor({ availabilityController }) {
        this.router = Router();
        this.availabilityController = availabilityController;

        this.router.get(
            "/",
            this.availabilityController.getAvailabilityBySlugPolling,
        );
    }
}
