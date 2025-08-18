// container.js (minimal, clean)
import { createContainer, asValue, asClass, asFunction } from "awilix";
import config from "./config/index.js";

import {
    createKafkaService,
    createRedisClient,
    db,
    RedisService,
} from "@event_ticket_booking_system/shared";

import { PaymentService } from "./services/payment.service.js";
import { PaymentController } from "./controllers/payment.controller.js";
import { ProfileRoutes } from "./routes/profile.routes.js";
import { ApiRoutes } from "./routes/api.routes.js";
import { InternalRoutes } from "./routes/internal.routes.js";
import { PaymentProducer } from "./kafka/payment.producer.js";
import { PaymentRoutes } from "./routes/payment.routes.js";
import PaymentIntentRouter from "./routes/payment.intent.routes.js";

export async function configureContainer() {
    const logger = console;

    // Kafka (producer only)
    logger.info("Pre-initializing Kafka...");
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka ready.");

    const container = createContainer();

    container.register({
        // core
        logger: asValue(logger),
        config: asValue(config),
        db: asValue(db),

        // redis
        redisClient: asFunction(createRedisClient).singleton(),
        redisService: asClass(RedisService).singleton(),

        // kafka producer
        paymentProducer: asClass(PaymentProducer).singleton(),
        kafkaService: asValue(kafkaServiceInstance),

        // services
        paymentService: asClass(PaymentService).singleton(),

        // controllers (nếu PaymentRoutes dùng)
        paymentController: asClass(PaymentController).scoped(),

        // routes
        profileRoutes: asClass(ProfileRoutes).singleton(),
        internalRoutes: asClass(InternalRoutes).singleton(),
        paymentRoutes: asClass(PaymentRoutes).singleton(),

        // payment-intent router: DÙNG redisService (không phải redisClient), kèm config tối thiểu
        paymentIntentRoutes: asClass(PaymentIntentRouter)
            .inject((c) => ({
                redisService: c.resolve("redisService"),
                paymentService: c.resolve("paymentService"),
                config: {
                    publicBaseUrl:
                        process.env.PUBLIC_BASE_URL ||
                        c.resolve("config").publicBaseUrl ||
                        "http://localhost:3006/api",
                    hmacKey: process.env.MOCKPAY_HMAC || "dev-secret",
                    mockSuccessRate: Number(
                        process.env.MOCKPAY_SUCCESS_RATE ?? 0.8,
                    ),
                    // providerMap chỉ để map "momo" -> "momo-mock" nếu cần MVP
                    providerMap: (() => {
                        try {
                            return JSON.parse(
                                process.env.PAYMENT_PROVIDER_MAP || "{}",
                            );
                        } catch {
                            return (
                                c.resolve("config").payment?.providerMap || {}
                            );
                        }
                    })(),
                    idemPadSec: Number(process.env.IDEM_TTL_PAD_SEC ?? 60),
                },
            }))
            .singleton(),

        // api aggregator
        apiRoutes: asClass(ApiRoutes).singleton(),
    });

    logger.info("✅ Dependencies registered (minimal).");
    return container;
}
