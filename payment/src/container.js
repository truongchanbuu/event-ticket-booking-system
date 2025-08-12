import { createContainer, asValue, asClass, asFunction } from "awilix";

import config from "./config/index.js";

import {
    createKafkaService,
    createLoggerFactory,
    createRedisClient,
    createServiceClients,
    db,
    MessageDispatcher,
    RedisLockService,
    RedisService,
} from "@event_ticket_booking_system/shared";
import { PaymentService } from "./services/payment.service.js";
import { PaymentController } from "./controllers/payment.controller.js";
import { ProfileRoutes } from "./routes/profile.routes.js";
import { ApiRoutes } from "./routes/api.routes.js";
import { InternalRoutes } from "./routes/internal.routes.js";
import { PaymentProducer } from "./kafka/payment.producer.js";
import { MomoClient } from "./providers/momo.client.js";
import { PaymentSucceededHandler } from "../../booking/src/kafka/handlers/payment-succeeded.handler.js";
import { PaymentFailedHandler } from "../../booking/src/kafka/handlers/payment-failed.handler.js";
import { PaymentCanceledHandler } from "../../booking/src/kafka/handlers/payment-cancelled.handler.js";
import { PaymentExpiredHandler } from "../../booking/src/kafka/handlers/payment-expired.handler.js";

export async function configureContainer() {
    const logger = console;

    logger.info("Pre-initializing critical async services...");
    const kafkaServiceInstance = await createKafkaService({ config, logger });
    logger.info("✅ Kafka service instance created successfully.");

    const { momo } = createServiceClients({
        momo: {
            baseURL: config.paymentClients.momo.endpoint,
            timeout: 7000,
            retry: { retries: 1 },
            requireApiKey: false,
            attachContext: false,
            unwrapEnvelope: false,
            throwOnNetworkError: true,
            successPredicate: (res) =>
                res.status === 200 && Number(res.data?.resultCode) === 0,
        },
    });

    const container = createContainer();

    const handlerMap = {};

    container.register({
        logger: asValue(logger),
        config: asValue(config),
        db: asValue(db),
        handlerMap: asValue(handlerMap),

        kafkaService: asValue(kafkaServiceInstance),
        redisClient: asFunction(createRedisClient).singleton(),
        redisService: asClass(RedisService).singleton(),
        redisLockService: asClass(RedisLockService).singleton(),

        momoHttp: asValue(momo.raw),
        momoClient: asClass(MomoClient)
            .inject((c) => ({
                partnerCode: config.paymentClients.momo.partnerCode,
                accessKey: config.paymentClients.momo.accessKey,
                secretKey: config.paymentClients.momo.secretKey,
                endpoint: config.paymentClients.momo.endpoint,
                returnUrl: config.paymentClients.momo.returnUrl,
                ipnUrl: config.paymentClients.momo.ipnUrl,
                timeoutMs: config.paymentClients.momo.timeoutMs ?? 5000,
                captureType:
                    config.paymentClients.momo.captureType ?? "captureWallet",
                http: c.resolve("momoHttp"),
            }))
            .singleton(),

        providerClients: asFunction(() =>
            container.resolve("momoClient"),
        ).singleton(),

        paymentProducer: asClass(PaymentProducer).singleton(),

        paymentService: asClass(PaymentService).singleton(),

        paymentController: asClass(PaymentController).scoped(),

        profileRoutes: asClass(ProfileRoutes).singleton(),
        internalRoutes: asClass(InternalRoutes).singleton(),
        apiRoutes: asClass(ApiRoutes).singleton(),

        paymentSucceededHandler: asClass(PaymentSucceededHandler).scoped(),
        paymentFailedHandler: asClass(PaymentFailedHandler).scoped(),
        paymentCanceledHandler: asClass(PaymentCanceledHandler).scoped(),
        paymentExpiredHandler: asClass(PaymentExpiredHandler).scoped(),

        messageDispatcher: asClass(MessageDispatcher).singleton(),
    });

    logger.info("✅ All dependencies registered. Container is ready.");

    return container;
}
