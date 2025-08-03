import "dotenv/config";
import { TICKET_TYPES_EVENTS } from "../../../shared/kafka/topics.js";
export default {
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || "development",
    },

    redis: {
        prefix: process.env.REDIS_PREFIX || "app",
        defaultTTL: process.env.REDIS_TTL || 300,
    },

    upstashRedis: {
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
    },

    localRedis: {
        host: process.env.LOCAL_REDIS_HOST || "127.0.0.1",
        port: process.env.LOCAL_REDIS_PORT || 6379,
        keyPrefix: process.env.SERVICE_NAME,
    },

    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: process.env.KAFKA_BROKERS.split(","),
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

        topics: {
            ticket_type_events: TICKET_TYPES_EVENTS,
        },
        consumerGroups: {
            main_events: "event-service-main-group",
            ticket_type_group: "event-service-ticket-type-group",
        },
        dlqTopics: {
            main_events_dlq: "event-service.main.dlq",
            ticket_type_dlq: "event-service.ticket-type.dlq",
        },
    },
};
