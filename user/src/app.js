import express from "express";
import cors from "cors";
import { scopePerRequest } from "awilix-express";

import healthRouter from "./routes/health.js";
import { errorHandler } from "@event_ticket_booking_system/shared";
import { ERROR_CODE } from "@event_ticket_booking_system/shared";
import { AppError } from "@event_ticket_booking_system/shared";
import checkJson from "@event_ticket_booking_system/shared/validator/helpers/syntax.validator.js";

export function createApp({ container }) {
    const app = express();

    // TODO: Test Config: Custom when production
    if (process.env.NODE_ENV == "development") app.use(cors());

    const logger = container.resolve("logger");
    app.use((req, res, next) => {
        logger?.debug(
            `📨 ${req.method} ${req.url} - ${new Date().toISOString()}`,
        );
        next();
    });

    app.use(express.json());
    app.use(checkJson);

    app.use("/api/health", healthRouter);

    app.use(scopePerRequest(container));

    const apiRoutes = container.resolve("apiRoutes");
    app.use("/api", apiRoutes.apiRouter);

    app.use((req, res, next) => {
        next(new AppError("Not Found", 404, ERROR_CODE.NOT_FOUND));
    });
    app.use(errorHandler);

    return app;
}
