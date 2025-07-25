import express from "express";
import cors from "cors";
import { scopePerRequest } from "awilix-express";

import container from "./container.js";
import { ENV } from "../src/config/env.js";
import healthRouter from "./routes/health.js";
import { errorHandler } from "@event_ticket_booking_system/shared";
import { ERROR_CODE } from "@event_ticket_booking_system/shared";
import { AppError } from "@event_ticket_booking_system/shared";
import checkJson from "@event_ticket_booking_system/shared/validator/helpers/syntax.validator.js";

export default async function createApp() {
    const app = express();

    // TODO: Test Config: Custom when production
    if (ENV.NODE_ENV == "development") app.use(cors());

    // Add logging middleware
    app.use((req, res, next) => {
        console.log(
            `📨 ${req.method} ${req.url} - ${new Date().toISOString()}`,
        );
        next();
    });

    app.use(express.json());
    app.use(checkJson);

    app.use("/api/health", healthRouter);

    app.use(scopePerRequest(container));

    const userRoutes = container.resolve("userRoutes");
    const organizerRoutes = container.resolve("organizerRoutes");
    const profileRoutes = container.resolve("profileRoutes");

    app.use("/api/me", profileRoutes.profileRouter);
    app.use("/api/users", userRoutes.userRouter);
    app.use("/api/organizers", organizerRoutes.organizerRouter);

    app.use((req, res, next) => {
        next(new AppError("Not Found", 404, ERROR_CODE.NOT_FOUND));
    });
    app.use(errorHandler);

    return app;
}
