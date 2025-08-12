import { TOPICS } from "@event_ticket_booking_system/shared";
import path from "path";
import dotenv from "dotenv";
import { redisConfig } from "@event_ticket_booking_system/shared/config/index.js";

const env = process.env.NODE_ENV || "development";
const envFile = `.env`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const isProduction = env === "production";

export default {
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || "development",
        serviceKey: process.env.SERVICE_SECRET_KEY,
    },

    serviceKeys: {
        eventService: process.env.EVENT_SERVICE_SECRET_KEY,
    },

    serviceUrls: {
        eventService: process.env.EVENT_SERVICE_URL,
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
        producerName: process.env.KAFKA_PRODUCER_SERVICE_NAME || "app",
        topics: {
            event_lifecycle: TOPICS.EVENT,
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
