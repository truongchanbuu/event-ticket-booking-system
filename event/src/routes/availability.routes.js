import { Router } from "express";

export class AvailabilityRoutes {
    constructor({ availabilityController }) {
        this.router = Router();
        this.availabilityController = availabilityController;

        this.router.get(
            "/",
            (req, res, next) => {
                console.log(`NEXT`);
                next();
            },
            this.availabilityController.getAvailabilityBySlug,
        );
    }
}
