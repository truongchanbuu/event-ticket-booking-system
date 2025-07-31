import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import { AuthRoutes } from "./routes/auth.routes.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { ApiRoutes } from "./routes/api.routes.js";

import {
    createRedisClient,
    RedisService,
    rootLogger,
} from "@event_ticket_booking_system/shared";
import { createKafkaService } from "./services/kafka.service.js";

/**
 * Hàm factory để tạo, đăng ký, và khởi động DI container.
 */
export async function configureContainer() {
    const logger = rootLogger;

    logger.info("Pre-initializing critical async services...");
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka service instance created successfully.");

    const container = createContainer();
    container.register({
        // Values & Clients (luôn là singleton)
        logger: asValue(logger),
        config: asValue(config),

        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asFunction(createRedisClient).singleton(),

        // Services (thường là singleton)
        redisService: asClass(RedisService).singleton(),

        authService: asClass(AuthService).singleton(),

        authController: asClass(AuthController).scoped(),

        authRoutes: asClass(AuthRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
