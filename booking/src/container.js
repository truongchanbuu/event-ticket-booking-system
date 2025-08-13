import { createContainer, asClass, asValue, asFunction } from "awilix";
import {
    createKafkaService,
    createRedisClient,
    createServiceClients,
    db,
    MessageDispatcher,
    RedisLockService,
    RedisService,
} from "@event_ticket_booking_system/shared";
import { config } from "./config/index.js";
import { ReservationService } from "./services/reservation.service.js";
import { EventInventoryClient } from "./services/event-inventory.service.js";
import { ApiRoutes } from "./routes/api.routes.js";
import { ReservationRoutes } from "./routes/reservation.routes.js";
import { ReservationController } from "./controllers/reservation.controller.js";
import { ReservationReaper } from "./scripts/reservation.reaper.js";
import { ReservationProducer } from "./kafka/producer/reservation.producer.js";
import { PaymentClient } from "./services/payment-client.service.js";
import { OrderService } from "./services/order.service.js";
import { handlerMap } from "./kafka/consumer/handleMap.js";
import { AutoCancelWorker } from "./workers/auto-cancel.worker.js";

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

    const redisService = new RedisService({
        config: {
            prefix: config.redis.prefix,
            defaultTTL: config.redis.defaultTTL,
        },
        logger,
        redisClient: redisClient.raw,
    });
    await redisService.initialize();
    logger.info("✅ Redis service initialized.");

    const httpRegistry = createServiceClients({
        events: {
            apiKey: config.serviceKeys.eventService,
            baseURL: config.serviceUrls.eventService,
        },
        payments: {
            apiKey: config.serviceKeys.paymentService,
            baseURL: config.serviceUrls.paymentService,
        },
    });

    // 2) Tạo container & register
    const container = createContainer();

    container.register({
        // core values
        logger: asValue(logger),
        config: asValue(config),
        db: asValue(db),
        handlerMap: asValue(handlerMap),
        httpRegistry: asValue(httpRegistry),

        // hạ tầng đã pre-init
        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asValue(redisClient),
        redisService: asValue(redisService),

        redisLockService: asClass(RedisLockService).singleton(),

        redisPubSub: asFunction(({ redisClient, logger }) => {
            const base = redisClient.raw;
            if (!base)
                throw new Error(
                    "Pub/Sub requires TCP Redis. Set backend=tcp-single/tcp-cluster",
                );

            const sub = base.duplicate();
            const pub = base;
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

        reservationProducer: asClass(ReservationProducer).singleton(),

        // domain services
        eventInventoryClient: asClass(EventInventoryClient).singleton(),
        paymentClient: asClass(PaymentClient).singleton(),
        orderService: asClass(OrderService).singleton(),
        reservationService: asClass(ReservationService).singleton(),

        // controllers
        reservationController: asClass(ReservationController).scoped(),

        // routes
        reservationRoutes: asClass(ReservationRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),

        // kafka dispatcher
        messageDispatcher: asClass(MessageDispatcher).singleton(),

        reservationReaper: asClass(ReservationReaper, {
            lifetime: "SINGLETON",
            dispose: (s) => s.stop?.(),
        }),
        autoCancelWorker: asClass(AutoCancelWorker).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

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
