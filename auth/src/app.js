import express from "express";
import cors from "cors";
import { scopePerRequest } from "awilix-express";

import healthRouter from "./routes/health.js";
import { errorHandler } from "@event_ticket_booking_system/shared";
import container from "./container.js";
import { ENV } from "../src/config/env.js";
import { ERROR_CODE } from "@event_ticket_booking_system/shared";
import { AppError } from "@event_ticket_booking_system/shared";

export default async function createApp() {
    const app = express();

    // Test Config: Custom when production
    if (ENV.NODE_ENV == "development") app.use(cors());

    app.use(express.json());
    app.use(scopePerRequest(container));

    const authRoutes = container.resolve("authRoutes");
    app.use("/", authRoutes.authRouter);
    app.use("/health", healthRouter);
    app.use((req, res, next) => {
        next(new AppError("Not Found", 404, ERROR_CODE.NOT_FOUND));
    });
    app.use(errorHandler);

    return app;
}
