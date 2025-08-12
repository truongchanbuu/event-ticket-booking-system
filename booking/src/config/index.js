import { redisConfig } from "@event_ticket_booking_system/shared";
import { buildKafkaConfig } from "./kafka.config.js";

export const config = {
    app: {
        port: Number(process.env.PORT || 3006),
        nodeEnv: process.env.NODE_ENV || "development",
        serviceKey: process.env.SERVICE_SECRET_KEY,
        url: process.env.SELF_URL || "http://localhost:3006",
    },

    reservation: {
        graceMs: Number(process.env.RESERVATION_GRACE_MS ?? 60000), // 60s
        autoCancel: {
            enabled: process.env.RESERVATION_AUTOCANCEL_ENABLED !== "false",
        },
    },
    autoCancel: {
        tickMs: Number(process.env.AUTOCANCEL_TICK_MS ?? 1500),
        batchSize: Number(process.env.AUTOCANCEL_BATCH_SIZE ?? 300),
        lockTtl: Number(process.env.AUTOCANCEL_LOCK_TTL ?? 10),
    },

    holdTtlSec: Number(process.env.HOLD_TTL_SEC || 900),
    idemTtlPadSec: Number(process.env.IDEM_TTL_PAD_SEC || 60),
    reservationMaxQty: Number(process.env.RESERVATION_MAX_QTY || 10),
    rateLimitResPerMin: Number(process.env.RATE_LIMIT_RES_PER_MIN || 60),

    redis: redisConfig,

    kafka: buildKafkaConfig(process.env),

    serviceKeys: {
        eventService: process.env.EVENT_SERVICE_SECRET_KEY,
        ticketService: process.env.TICKET_SERVICE_SECRET_KEY,
        revalidateKey: process.env.REVALIDATE_KEY,
        paymentService: process.env.PAYMENT_SERVICE_KEY,
    },

    serviceUrls: {
        eventService: process.env.EVENT_SERVICE_SECRET_URL,
        ticketService: process.env.TICKET_SERVICE_URL,
        paymentService: process.env.PAYMENT_SERVICE_URL,
        frontend: process.env.FRONTEND_URL,
    },

    httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS || 1500),
};
