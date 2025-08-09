import { createContainer, asValue, asClass, asFunction } from "awilix";
import config from "./config/index.js";

import {
    createKafkaService,
    createLoggerFactory,
    createRedisClient,
    db,
    internalHttpClient,
    MessageDispatcher,
    RedisLockService,
    RedisService, // bản ioredis-only đã optimize (có initialize())
    TICKET_TYPE_CREATED,
    TICKET_TYPE_DELETED,
    TICKET_TYPE_UPDATED,
} from "@event_ticket_booking_system/shared";

import { EventService } from "./services/event.service.js";
import { AvailabilityService } from "./services/availability.service.js";
import { EventRoutes } from "./routes/event.routes.js";
import { EventController } from "./controllers/event.controller.js";
import { InternalController } from "./controllers/internal.controller.js";
import { AvailabilityController } from "./controllers/availability.controller.js";
import { ProfileRoutes } from "./routes/profile.routes.js";
import { TicketTypeSnapshotRepo } from "./repositories/TicketRepository.js";
import { CreateTicketTypeSnapshotUseCase } from "./kafka/consumer/CreateTicketTypeSnapshot.js";
import { UpdateTicketTypeSnapshotUseCase } from "./kafka/consumer/UpdateTicketTypeSnapshot.js";
import { DeleteTicketTypeSnapshotUseCase } from "./kafka/consumer/DeleteTicketTypeSnapshot.js";
import { EventLifecycleEventService } from "./kafka/event-lifecycle.js";
import { ContributorService } from "./services/contributor.service.js";
import { InternalRoutes } from "./routes/internal.routes.js";
import { ApiRoutes } from "./routes/api.routes.js";
import { TicketClientService } from "./services/ticket-client.service.js";
import { InventoryService } from "./services/inventory.service.js";
import { EmbeddedBroadcaster } from "./adapters/broadcaster.sse.js";
import { AvailabilitySSERoutes } from "./routes/availability.see.routes.js";

export async function configureContainer() {
    const logger = console;

    logger.info("Pre-initializing critical async services...");

    // Kafka
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka service instance created.");

    const redisClient = createRedisClient({
        config: { redis: config.redis },
        logger,
    });
    await redisClient.connect();
    logger.info("✅ Redis client connected.");

    // RedisService (atomic set+tag via Lua)
    const redisService = new RedisService({
        config: {
            prefix: config.redis.prefix,
            defaultTTL: config.redis.defaultTTL,
        },
        logger,
        redisClient: redisClient.raw, // truyền ioredis/cluster instance
    });
    await redisService.initialize(); // load Lua scripts
    logger.info("✅ Redis service initialized.");

    // 2) Tạo container & register
    const container = createContainer();

    const handlerMap = {
        [TICKET_TYPE_CREATED]: "createTicketTypeSnapshotUseCase",
        [TICKET_TYPE_UPDATED]: "updateTicketTypeSnapshotUseCase",
        [TICKET_TYPE_DELETED]: "deleteTicketTypeSnapshotUseCase",
    };

    container.register({
        // core values
        logger: asValue(logger),
        config: asValue(config),
        db: asValue(db),
        handlerMap: asValue(handlerMap),
        internalHttpClient: asValue(internalHttpClient),

        // hạ tầng đã pre-init
        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asValue(redisClient),
        redisService: asValue(redisService),

        // Redis lock (dùng redisService/raw bên trên)
        redisLockService: asClass(RedisLockService).singleton(),

        // Pub/Sub: dùng connection riêng cho SUB (không share .raw)
        redisPubSub: asFunction(({ redisClient, logger }) => {
            const base = redisClient.raw;
            if (!base)
                throw new Error(
                    "Pub/Sub requires TCP Redis. Set backend=tcp-single/tcp-cluster",
                );

            const sub = base.duplicate(); // kết nối mới cho SUB
            const pub = base; // PUB có thể dùng kết nối chính
            let connected = false;

            return {
                async connect() {
                    if (connected) return;
                    await sub.connect();
                    connected = true;
                },
                async psubscribe(pattern, handler) {
                    if (!connected) await sub.connect();
                    await sub.psubscribe(pattern);
                    sub.on("pmessage", (_pattern, channel, message) =>
                        handler({ channel, message }),
                    );
                },
                async subscribe(channel, handler) {
                    if (!connected) await sub.connect();
                    await sub.subscribe(channel);
                    sub.on("message", (ch, message) =>
                        handler({ channel: ch, message }),
                    );
                },
                async unsubscribe(channel) {
                    if (!connected) return;
                    try {
                        await sub.unsubscribe(channel);
                    } catch {}
                },
                async publish(channel, message) {
                    return pub.publish(channel, message);
                },
                async close() {
                    try {
                        await sub.quit();
                    } catch {}
                },
            };
        }).singleton(),

        // broadcaster SSE
        broadcaster: asClass(EmbeddedBroadcaster).singleton(),

        // domain services
        ticketTypeSnapshotRepo: asClass(TicketTypeSnapshotRepo).singleton(),
        ticketClientService: asClass(TicketClientService).singleton(),
        contributorService: asClass(ContributorService).singleton(),
        eventService: asClass(EventService).singleton(),

        inventoryService: asClass(InventoryService)
            .singleton()
            .inject(() => ({ pubsub: container.resolve("redisPubSub") })),

        availabilityService: asClass(AvailabilityService).singleton(),
        eventLifecycleEventService: asClass(
            EventLifecycleEventService,
        ).singleton(),

        // controllers
        availabilityController: asClass(AvailabilityController).scoped(),
        eventController: asClass(EventController).scoped(),
        internalController: asClass(InternalController).scoped(),

        // routes
        eventRoutes: asClass(EventRoutes).singleton(),
        profileRoutes: asClass(ProfileRoutes).singleton(),
        internalRoutes: asClass(InternalRoutes).singleton(),
        availabilitySseRoutes: asClass(AvailabilitySSERoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),

        // kafka dispatcher
        createTicketTypeSnapshotUseCase: asClass(
            CreateTicketTypeSnapshotUseCase,
        ).scoped(),
        updateTicketTypeSnapshotUseCase: asClass(
            UpdateTicketTypeSnapshotUseCase,
        ).scoped(),
        deleteTicketTypeSnapshotUseCase: asClass(
            DeleteTicketTypeSnapshotUseCase,
        ).scoped(),
        messageDispatcher: asClass(MessageDispatcher).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    // (tuỳ chọn) expose shutdown hook để app gọi trong SIGTERM
    container.register({
        shutdown: asFunction(
            ({ kafkaService, redisClient, redisPubSub, logger }) => {
                return async function shutdown() {
                    logger.info("Shutting down...");
                    try {
                        await redisPubSub.close?.();
                    } catch {}
                    try {
                        await redisClient.quit();
                    } catch {}
                    try {
                        await kafkaService.disconnect?.();
                    } catch {}
                    logger.info("✅ Shutdown complete.");
                };
            },
        ).singleton(),
    });

    return container;
}
