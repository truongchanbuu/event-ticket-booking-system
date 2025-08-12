import { Router } from "express";

export class ApiRoutes {
    constructor({ reservationRoutes }) {
        this.router = Router();
        this.router.use("/", reservationRoutes.router);
    }
}
