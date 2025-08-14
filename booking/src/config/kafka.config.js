import { TOPICS } from "@event_ticket_booking_system/shared";

const num = (v, d) => {
    const n = parseInt(`${v ?? ""}`, 10);
    return Number.isFinite(n) ? n : d;
};
const bool = (v, d = false) =>
    v === "true" ? true : v === "false" ? false : d;

export function buildKafkaConfig(env = process.env) {
    const isProduction = env.NODE_ENV === "production";
    const brokers = (env.KAFKA_BROKERS || "localhost:9092")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const kafkaSsl = bool(env.KAFKA_SSL, false) ? {} : undefined;
    const kafkaSasl =
        env.KAFKA_SASL_MECHANISM &&
        env.KAFKA_SASL_USERNAME &&
        env.KAFKA_SASL_PASSWORD
            ? {
                  mechanism: env.KAFKA_SASL_MECHANISM,
                  username: env.KAFKA_SASL_USERNAME,
                  password: env.KAFKA_SASL_PASSWORD,
              }
            : undefined;

    return {
        clientId: env.KAFKA_CLIENT_ID || "booking-service",
        brokers,
        ssl: kafkaSsl || undefined,
        sasl: kafkaSasl,
        connectionTimeout: num(env.KAFKA_CONNECTION_TIMEOUT, 3000),
        authenticationTimeout: num(env.KAFKA_AUTH_TIMEOUT, 3000),
        retry: {
            initialRetryTime: num(env.KAFKA_INITIAL_RETRY_TIME, 100),
            retries: num(env.KAFKA_RETRIES, 5),
        },

        // consumer defaults
        sessionTimeout: num(env.KAFKA_SESSION_TIMEOUT, 30000),
        heartbeatInterval: num(env.KAFKA_HEARTBEAT_INTERVAL, 3000),

        producerName: env.KAFKA_PRODUCER_SERVICE_NAME || "booking-service",

        topics: {
            payment_events: TOPICS.PAYMENT,
            availability_events: TOPICS.AVAiLABILITY,
        },

        consumerGroups: {
            payment_group: env.KAFKA_GID_PAYMENT || "booking-service-payment",
            availability_group: env.KAFKA_GID_AVAILABILITY || "booking-service-availability",
            dlq_group: env.KAFKA_GID_DLQ || "booking-service-dlq",
            global_retry_group: env.KAFKA_GID_RETRY || "booking-service-retry",
        },

        dlqTopics: {
            main_events_dlq: env.KAFKA_DLQ_MAIN || `${TOPICS.PAYMENT}.dlq`,
        },

        defaults: {
            replicationFactor: num(env.KAFKA_REPL_FACTOR, isProduction ? 3 : 1),
            partitions: num(env.KAFKA_DEFAULT_PARTITIONS, 3),
            retryRetentionMs: num(
                env.KAFKA_RETRY_RETENTION_MS,
                5 * 24 * 3600 * 1000,
            ),
            dlqRetentionMs: num(
                env.KAFKA_DLQ_RETENTION_MS,
                30 * 24 * 3600 * 1000,
            ),
        },
    };
}
