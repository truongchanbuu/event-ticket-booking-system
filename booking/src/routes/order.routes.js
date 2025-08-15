import { Router } from "express";
import { rlOnce } from "../middlewares/rate-limit.middleware.js";

export class OrderRoutes {
    constructor({ redisService, orderController }) {
        this.router = Router();
        this.orderController = orderController;

        this.router.get(
            "/claim",
            rlOnce({
                redis: redisService,
                routeKey: "orders:claim",
                windowSec: 60,
            }),
            this.orderController.getOrderByClaim,
        );
    }
}
