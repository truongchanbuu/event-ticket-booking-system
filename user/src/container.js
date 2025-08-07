import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import { createKafkaService } from "./services/kafka.service.js";

import { UserService } from "./services/user.service.js";
import { OrganizerService } from "./services/organizer.service.js";
import { ApplicationEventService } from "./kafka/application.event.js";

import { UserController } from "./controllers/user.controller.js";
import { OrganizerController } from "./controllers/organizer.controller.js";

import { ApiRoutes } from "./routes/api.routes.js";
import { UserRoutes } from "./routes/user.routes.js";
import { OrganizerRoutes } from "./routes/organizer.routes.js";
import { ProfileRoutes } from "./routes/profile.routes.js";

import {
    createLoggerFactory,
    createRedisClient,
    RedisLockService,
    RedisService,
} from "@event_ticket_booking_system/shared";

/**
 * Hàm factory để tạo, đăng ký, và khởi động DI container.
 */
export async function configureContainer() {
    const logger = console;
    // const logger = createLoggerFactory(config.app).logger;

    logger.info("Pre-initializing critical async services...");
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka service instance created successfully.");

    const container = createContainer();
    container.register({
        logger: asValue(logger),
        config: asValue(config),

        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asFunction(createRedisClient).singleton(),

        // Services (thường là singleton)
        redisService: asClass(RedisService).singleton(),
        redisLockService: asClass(RedisLockService).singleton(),
        userService: asClass(UserService).singleton(),
        organizerService: asClass(OrganizerService).singleton(),
        applicationEventService: asClass(ApplicationEventService).singleton(),

        // Controllers (luôn là scoped)
        userController: asClass(UserController).scoped(),
        organizerController: asClass(OrganizerController).scoped(),

        // Routes (luôn là singleton)
        userRoutes: asClass(UserRoutes).singleton(),
        organizerRoutes: asClass(OrganizerRoutes).singleton(),
        profileRoutes: asClass(ProfileRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
