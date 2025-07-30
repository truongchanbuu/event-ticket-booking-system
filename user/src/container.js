import { createContainer, asValue, asClass } from "awilix";
// import { createLogger } from "@event_ticket_booking_system/shared";

import config from "./config/index.js";
import UserService from "../src/services/user.service.js";
import UserController from "../src/controllers/user.controller.js";
import OrganizerController from "../src/controllers/organizer.controller.js";
import OrganizerService from "../src/services/organizer.service.js";
import UserRoutes from "../src/routes/user.routes.js";
import OrganizerRoutes from "./routes/organizer.routes.js";
import { RedisService } from "@event_ticket_booking_system/shared";
import Profileroutes from "./routes/profile.routes.js";
import redisClient from "@event_ticket_booking_system/shared/redis/main.js";
import rootLogger from "@event_ticket_booking_system/shared/logger/index.js";

const container = createContainer();

// Logger
// const loggerInstance = createLogger();

container.register({
    logger: asValue(rootLogger),
    prefix: asValue(config.redis.prefix),
    defaultTTL: asValue(config.redis.defaultTTL),
    client: asValue(redisClient),
    redisService: asClass(RedisService).singleton(),
    userService: asClass(UserService).scoped(),
    organizerService: asClass(OrganizerService).scoped(),
    userController: asClass(UserController).singleton(),
    organizerController: asClass(OrganizerController).singleton(),
    userRoutes: asClass(UserRoutes).singleton(),
    organizerRoutes: asClass(OrganizerRoutes).singleton(),
    profileRoutes: asClass(Profileroutes).singleton(),
});

export default container;
