import { EVENT_LIFECYCLE_EVENTS } from "@event_ticket_booking_system/shared";
import path from "path";
import dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
const envFile = `.env`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const isProduction = env === "production";

/* ---------------- Redis ---------------- */
const redisConfig = {
    prefix: process.env.REDIS_PREFIX || "app",
    defaultTTL: Number.parseInt(process.env.REDIS_TTL || "", 10) || 300,

    // Chọn backend theo môi trường
    backend:
        process.env.REDIS_BACKEND || (isProduction ? "upstash-rest" : "tcp"),
    production: {
        upstashRest: {
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        },
        // GCP Memorystore / bất kỳ Redis TCP
        tcp: {
            url: process.env.REDIS_URL, // ví dụ: redis://host:6379
        },
    },
    development: {
        tcp: {
            url: `redis://${process.env.LOCAL_REDIS_HOST || "127.0.0.1"}:${process.env.LOCAL_REDIS_PORT || 6379}`,
        },
    },
};

if (isProduction) {
    const backend = redisConfig.backend;
    if (backend === "upstash-rest") {
        if (
            !redisConfig.production.upstashRest.url ||
            !redisConfig.production.upstashRest.token
        ) {
            throw new Error(
                "FATAL: UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN required in production.",
            );
        }
    } else if (backend === "tcp") {
        if (!redisConfig.production.tcp.url) {
            throw new Error(
                "FATAL: REDIS_URL required for TCP Redis in production.",
            );
        }
    }
}

if (
    isProduction &&
    (!redisConfig.production.url || !redisConfig.production.token)
) {
    throw new Error(
        "FATAL ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be defined for production.",
    );
}

export default {
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || "development",
        serviceKey: process.env.SERVICE_SECRET_KEY,
    },

    service_keys: {
        event_service: process.env.EVENT_SERVICE_SECRET_KEY,
    },

    service_urls: {
        event_service: process.env.EVENT_SERVICE_URL,
    },

    redis: redisConfig,

    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: process.env.KAFKA_BROKERS
            ? process.env.KAFKA_BROKERS.split(",")
            : [],
        connectionTimeout: Number.isNaN(
            Number(process.env.KAFKA_CONNECTION_TIMEOUT),
        )
            ? 3000
            : parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10),
        authenticationTimeout: Number.isNaN(
            Number(process.env.KAFKA_AUTH_TIMEOUT),
        )
            ? 3000
            : parseInt(process.env.KAFKA_AUTH_TIMEOUT, 10),
        retry: {
            initialRetryTime: 100,
            retries: 5,
        },
        sessionTimeout: 300000,
        heartbeatInterval: 10000,
        producer_name: process.env.KAFKA_PRODUCER_SERVICE_NAME || "app",
        topics: {
            event_lifecycle: EVENT_LIFECYCLE_EVENTS,
        },
        consumerGroups: {
            main_events: "ticket-service-main-group",
            event_ticket_type_group: "event-ticket-type-group",
            dlq_group: "ticket-service-dlq",
            global_retry_group: "ticket-service-global-retry-handler",
        },
        dlqTopics: {
            main_tickets_dlq: "ticket-service.main.dlq",
        },
    },
};
