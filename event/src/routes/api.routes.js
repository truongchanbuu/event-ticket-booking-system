import express from "express";

export class ApiRoutes {
    /**
     * Constructor nhận vào các instance của các class route con.
     * @param {object} dependencies - Các dependency được inject.
     * @param {ProfileRoutes} dependencies.profileRoutes - Instance của ProfileRoutes.
     * @param {UserRoutes} dependencies.userRoutes - Instance của UserRoutes.
     * @param {OrganizerRoutes} dependencies.organizerRoutes - Instance của OrganizerRoutes.
     */
    constructor({ eventRoutes, profileRoutes }) {
        this.router = express.Router();
        this.router.use("/events", eventRoutes.router);
        this.router.use("/me", profileRoutes.router);
    }
}
