import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import { ApiRoutes } from "./routes/api.routes.js";

import {
    createLoggerFactory,
    createRedisClient,
    db,
    internalHttpClient,
    MessageDispatcher,
    RedisLockService,
    RedisService,
    TICKET_TYPE_CREATED,
    TICKET_TYPE_DELETED,
    TICKET_TYPE_UPDATED,
} from "@event_ticket_booking_system/shared";
import { createKafkaService } from "./services/kafka.service.js";
import { TicketService } from "./services/ticket.service.js";
import { TicketRoutes } from "./routes/ticket.routes.js";
import { TicketController } from "./controllers/ticket.controller.js";
import { EventClientService } from "./services/event-client.service.js";
import { TicketLifecycleEventService } from "./kafka/ticket-lifecycle.events.js";
import { InternalController } from "./controllers/internal.controller.js";
import { InternalRoutes } from "./routes/internal.routes.js";

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
        internalHttpClient: asValue(internalHttpClient),

        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asFunction(createRedisClient).singleton(),
        redisService: asClass(RedisService).singleton(),
        redisLockService: asClass(RedisLockService).singleton(),
        eventClientService: asClass(EventClientService).singleton(),
        ticketService: asClass(TicketService).singleton(),
        ticketLifecycleEventService: asClass(
            TicketLifecycleEventService,
        ).singleton(),

        ticketController: asClass(TicketController).scoped(),
        internalController: asClass(InternalController).scoped(),

        ticketRoutes: asClass(TicketRoutes).singleton(),
        internalRoutes: asClass(InternalRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),

        // createTicketTypeSnapshotUseCase: asClass(
        //     CreateTicketTypeSnapshotUseCase,
        // ).scoped(),
        // updateTicketTypeSnapshotUseCase: asClass(
        //     UpdateTicketTypeSnapshotUseCase,
        // ).scoped(),
        // deleteTicketTypeSnapshotUseCase: asClass(
        //     DeleteTicketTypeSnapshotUseCase,
        // ).scoped(),

        messageDispatcher: asClass(MessageDispatcher).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
