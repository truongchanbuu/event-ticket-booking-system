import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import {
    createLoggerFactory,
    createRedisClient,
    createServiceClients,
    db,
    EVENT_PUBLISHED,
    MessageDispatcher,
    RedisLockService,
    RedisService,
} from "@event_ticket_booking_system/shared";
import { createKafkaService } from "./services/kafka.service.js";
import { TicketService } from "./services/ticket.service.js";
import { TicketRoutes } from "./routes/ticket.routes.js";
import { TicketController } from "./controllers/ticket.controller.js";
import { EventClientService } from "./services/event-client.service.js";
import { TicketLifecycleEventService } from "./kafka/ticket-lifecycle.events.js";
import { InternalController } from "./controllers/internal.controller.js";
import { InternalRoutes } from "./routes/internal.routes.js";
import { ApiRoutes } from "./routes/api.routes.js";
import { PublishTicketTypesSnapshotUseCase } from "./kafka/use-case/PublishEventSnapshotUseCase.js";

export async function configureContainer() {
    // const logger = createLoggerFactory(config.app).logger;
    const logger = console;

    logger.info("Pre-initializing critical async services...");
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka service instance created successfully.");

    const httpRegistry = createServiceClients({
        events: {
            baseURL: config.serviceUrls.eventService,
            apiKey: config.serviceKeys.eventService,
        },
    });

    const container = createContainer();

    const handlerMap = {
        [EVENT_PUBLISHED]: "publishTicketTypesSnapshotUseCase",
    };

    container.register({
        logger: asValue(logger),
        config: asValue(config),
        db: asValue(db),
        handlerMap: asValue(handlerMap),
        httpRegistry: asValue(httpRegistry),

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
        publishTicketTypesSnapshotUseCase: asClass(
            PublishTicketTypesSnapshotUseCase,
        ).scoped(),

        messageDispatcher: asClass(MessageDispatcher).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
