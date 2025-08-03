import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import { ApiRoutes } from "./routes/api.routes.js";

import {
    createLoggerFactory,
    createRedisClient,
    db,
    MessageDispatcher,
    RedisService,
    TICKET_CANCELLED,
    TICKET_CHECK_IN_REVERSED,
    TICKET_CHECKED_IN,
    TICKET_ISSUED,
    TICKET_TYPE_CREATED,
    TICKET_TYPE_DELETED,
    TICKET_TYPE_UPDATED,
} from "@event_ticket_booking_system/shared";
import { createKafkaService } from "./services/kafka.service.js";
import { EventService } from "./services/event.service.js";
import { EventRoutes } from "./routes/event.routes.js";
import { EventController } from "./controllers/event.controller.js";
import { ProfileRoutes } from "./routes/profile.routes.js";
import { TicketTypeSnapshotRepo } from "./repositories/TicketRepository.repo.js";
import { CreateTicketTypeSnapshotUseCase } from "./kafka/consumer/CreateTicketTypeSnapshot.js";

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

    const handlerMap = {
        // Mapping cho Ticket Type
        [TICKET_TYPE_CREATED]: "createTicketTypeSnapshotUseCase",
        [TICKET_TYPE_UPDATED]: "updateTicketTypeSnapshotUseCase",
        [TICKET_TYPE_DELETED]: "deleteTicketTypeSnapshotUseCase",

        // Mapping cho vé lẻ (có thể gom vào một use case để xử lý logic tăng/giảm)
        // [TICKET_ISSUED]: "updateTicketSaleStatsUseCase",
        // [TICKET_CANCELLED]: "updateTicketSaleStatsUseCase",

        // Mapping cho check-in
        // [TICKET_CHECKED_IN]: "updateTicketCheckInStatsUseCase",
        // [TICKET_CHECK_IN_REVERSED]: "updateTicketCheckInStatsUseCase",
    };

    container.register({
        logger: asValue(logger),
        config: asValue(config),
        db: asValue(db),
        handlerMap: asValue(handlerMap),

        ticketTypeSnapshotRepo: asClass(TicketTypeSnapshotRepo).singleton(),

        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asFunction(createRedisClient).singleton(),
        eventService: asClass(EventService).singleton(),
        redisService: asClass(RedisService).singleton(),

        eventController: asClass(EventController).scoped(),

        eventRoutes: asClass(EventRoutes).singleton(),
        profileRoutes: asClass(ProfileRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),

        createTicketTypeSnapshotUseCase: asClass(
            CreateTicketTypeSnapshotUseCase,
        ).scoped(),

        messageDispatcher: asClass(MessageDispatcher).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
