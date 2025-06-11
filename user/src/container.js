import { createContainer, asValue, asClass } from "awilix";
import { createLogger } from "@event_ticket_booking_system/shared";

import UserService from "../src/services/user.service.js";
import UserController from "../src/controllers/user.controller.js";
import UserRoutes from "../src/routes/user.routes.js";

const container = createContainer();

// Logger
const loggerInstance = createLogger();

container.register({
    logger: asValue(loggerInstance),
    userService: asClass(UserService).scoped(),
    userController: asClass(UserController).singleton(),
    userRoutes: asClass(UserRoutes).singleton(),
});

export default container;
