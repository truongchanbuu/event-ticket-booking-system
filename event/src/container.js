import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import { ApiRoutes } from "./routes/api.routes.js";

import {
    createLoggerFactory,
    createRedisClient,
    RedisService,
} from "@event_ticket_booking_system/shared";
import { createKafkaService } from "./services/kafka.service.js";
import { EventService } from "./services/event.service.js";
import { EventRoutes } from "./routes/event.routes.js";
import { EventController } from "./controllers/event.controller.js";
import { ProfileRoutes } from "./routes/profile.routes.js";

/**
 * Hàm factory để tạo, đăng ký, và khởi động DI container.
 */
export async function configureContainer() {
    // const logger = createLoggerFactory(config.app).logger;
    const logger = console;

    logger.info("Pre-initializing critical async services...");
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka service instance created successfully.");

    const container = createContainer();
    container.register({
        logger: asValue(logger),
        config: asValue(config),

        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asFunction(createRedisClient).singleton(),
        eventService: asClass(EventService).singleton(),
        redisService: asClass(RedisService).singleton(),

        eventController: asClass(EventController).scoped(),

        eventRoutes: asClass(EventRoutes).singleton(),
        profileRoutes: asClass(ProfileRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
