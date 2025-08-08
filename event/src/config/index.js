import dotenv from "dotenv";
import path from "path";
import {
    EVENT_LIFECYCLE_EVENTS,
    TICKET_TYPES_EVENTS,
} from "@event_ticket_booking_system/shared";

const env = process.env.NODE_ENV || "development";
const envFile = `.env`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const isProduction = env === "production";
const redisConfig = {
    prefix: process.env.REDIS_PREFIX || "app",
    defaultTTL: parseInt(process.env.REDIS_TTL, 10) || 300,

    isProduction: isProduction,
    production: {
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
    development: {
        url: `redis://${process.env.LOCAL_REDIS_HOST || "127.0.0.1"}:${process.env.LOCAL_REDIS_PORT || 6379}`,
    },
};

if (
    isProduction &&
    (!redisConfig.production.url || !redisConfig.production.token)
) {
    throw new Error(
        "FATAL ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be defined for production.",
    );
}

const config = {
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: env,
        serviceKey: process.env.SERVICE_SECRET_KEY,
    },
    redis: redisConfig,
    service_keys: {
        ticket_service: process.env.TICKET_SERVICE_SECRET_KEY,
    },
    service_urls: {
        ticket_service: process.env.TICKET_SERVICE_URL,
    },
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
            main_events: EVENT_LIFECYCLE_EVENTS,
            ticket_type_events: TICKET_TYPES_EVENTS,
        },
        consumerGroups: {
            main_events: "event-service-main-group",
            ticket_type_group: "event-service-ticket-type-group",
            dlq_group: "main-service-dlq",
            global_retry_group: "event-service-global-retry-handler",
        },
        dlqTopics: {
            main_events_dlq: "main_events_dlq_topic_name",
        },
    },
};

console.log(`${config.kafka.brokers} - ${process.env.KAFKA_BROKERS}`);
if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
    throw new Error("FATAL ERROR: KAFKA_BROKERS is not defined.");
}

export default config;
