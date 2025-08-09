import express from "express";
import cors from "cors";
import { scopePerRequest } from "awilix-express";

import { checkJson, errorHandler } from "@event_ticket_booking_system/shared";
import { ERROR_CODE } from "@event_ticket_booking_system/shared";
import { AppError } from "@event_ticket_booking_system/shared";

import healthRouter from "./routes/health.js";
import { registry } from "./metrics/availability.metric.js";

export function createApp({ container, config, logger }) {
    const app = express();

    app.use((req, res, next) => {
        console.log(
            `📨 ${req.method} ${req.url} - ${new Date().toISOString()}`,
        );
        next();
    });

    if (config.app.nodeEnv === "development") app.use(cors());
    app.use(express.json());
    app.use(checkJson);

    app.use("/api/health", healthRouter);
    app.get("/metrics", async (_req, res) => {
        res.set("Content-Type", registry.contentType);
        res.end(await registry.metrics());
    });

    app.use(scopePerRequest(container));

    const apiRoutes = container.resolve("apiRoutes");
    app.use("/api", apiRoutes.router);

    app.use((req, res, next) =>
        next(new AppError("Not Found", 404, ERROR_CODE.NOT_FOUND)),
    );
    app.use(errorHandler);
    return app;
}
