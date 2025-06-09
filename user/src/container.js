import { createContainer, asValue, asClass } from "awilix";
import { createLogger } from "@event_ticket_booking_system/shared";

import AuthRoutes from "./routes/auth.routes.js";
import AuthService from "./services/auth.service.js";
import AuthController from "./controllers/auth.controller.js";

const container = createContainer();

// Logger
const loggerInstance = createLogger();

container.register({
    logger: asValue(loggerInstance),
    authService: asClass(AuthService).scoped(),
    authController: asClass(AuthController).singleton(),
    authRoutes: asClass(AuthRoutes).singleton(),
});

export default container;
