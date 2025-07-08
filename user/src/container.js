import { createContainer, asValue, asClass } from "awilix";
import { createLogger } from "@event_ticket_booking_system/shared";

import UserService from "../src/services/user.service.js";
import UserController from "../src/controllers/user.controller.js";
import OrganizerController from "../src/controllers/organizer.controller.js";
import OrganizerService from "../src/services/organizer.service.js";
import UserRoutes from "../src/routes/user.routes.js";
import OrganizerRoutes from "./routes/organizer.routes.js";

const container = createContainer();

// Logger
const loggerInstance = createLogger();

container.register({
    logger: asValue(loggerInstance),
    userService: asClass(UserService).scoped(),
    organizerService: asClass(OrganizerService).scoped(),
    userController: asClass(UserController).singleton(),
    organizerController: asClass(OrganizerController).singleton(),
    userRoutes: asClass(UserRoutes).singleton(),
    organizerRoutes: asClass(OrganizerRoutes).singleton(),
});

export default container;
