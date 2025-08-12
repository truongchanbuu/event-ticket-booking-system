import express from "express";
import cors from "cors";
import { scopePerRequest } from "awilix-express";

import healthRouter from "./routes/health.js";
import { checkJson, errorHandler } from "@event_ticket_booking_system/shared";
import { ERROR_CODE } from "@event_ticket_booking_system/shared";
import { AppError } from "@event_ticket_booking_system/shared";

export function createApp({ container, config, logger }) {
    const app = express();

    // Test Config: Custom when production
    if (config.app.nodeEnv == "development") app.use(cors());

    // Add logging middleware
    app.use((req, res, next) => {
        logger?.debug(
            `📨 ${req.method} ${req.url} - ${new Date().toISOString()}`,
        );
        next();
    });

    app.use("/api/health", healthRouter);

    app.use(express.json());
    app.use(checkJson);

    app.use(scopePerRequest(container));

    const apiRoutes = container.resolve("apiRoutes");
    app.use("/api", apiRoutes.router);

    app.use((req, res, next) => {
        next(
            new AppError({
                message: "Not Found",
                statusCode: 404,
                errorCode: ERROR_CODE.NOT_FOUND,
            }),
        );
    });
    app.use(errorHandler);

    return app;
}
