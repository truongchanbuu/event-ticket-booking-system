import { Router } from "express";

export class ApiRoutes {
    constructor({ reservationRoutes, orderRoutes }) {
        this.router = Router();
        this.router.use("/orders", orderRoutes.router);
        this.router.use("/", reservationRoutes.router);
    }
}
