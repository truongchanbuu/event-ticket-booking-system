// src/routes/api.router.js
import express from "express";

export class ApiRoutes {
    /**
     * Constructor nhận vào các instance của các class route con.
     * @param {object} dependencies - Các dependency được inject.
     * @param {ProfileRoutes} dependencies.profileRoutes - Instance của ProfileRoutes.
     * @param {UserRoutes} dependencies.userRoutes - Instance của UserRoutes.
     * @param {OrganizerRoutes} dependencies.organizerRoutes - Instance của OrganizerRoutes.
     */
    constructor({ profileRoutes, userRoutes, organizerRoutes }) {
        this.router = express.Router();

        this.router.use("/me", profileRoutes.router);
        this.router.use("/users", userRoutes.router);
        this.router.use("/organizers", organizerRoutes.router);
    }

    get apiRouter() {
        return this.router;
    }
}
