import { Router } from "express";

export class AvailabilityRoutes {
    constructor({ availabilityController }) {
        this.router = Router();
        this.availabilityController = availabilityController;

        this.router.head(
            "/",
            this.availabilityController.getAvailabilityBySlugHead,
        );

        this.router.get(
            ["", "/"],
            this.availabilityController.getAvailabilityBySlug,
        );

        this.router.use((req, res) => {
            console.log(
                "[AVAIL ROUTER] 404 fallback",
                req.method,
                req.originalUrl,
            );
            res.status(404).json({ message: "availability route not found" });
        });
    }
}
