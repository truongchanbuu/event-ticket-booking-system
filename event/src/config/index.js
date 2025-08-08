import dotenv from "dotenv";
import path from "path";
import {
    EVENT_LIFECYCLE_EVENTS, // đảm bảo đây là STRING topic name
    TICKET_TYPES_EVENTS, // idem
} from "@event_ticket_booking_system/shared";

const env = process.env.NODE_ENV || "development";
const envFiles = [`.env.${env}`, `.env`]; // ưu tiên theo NODE_ENV
for (const f of envFiles) {
    dotenv.config({ path: path.resolve(process.cwd(), f) });
}

const isProduction = env === "production";

/* ---------------- Redis ---------------- */
const redisConfig = {
    prefix: process.env.REDIS_PREFIX || "app",
    defaultTTL: Number.parseInt(process.env.REDIS_TTL || "", 10) || 300,

    // Chọn backend theo môi trường
    backend:
        process.env.REDIS_BACKEND || (isProduction ? "upstash-rest" : "tcp"),
    production: {
        // Upstash REST (chỉ nên cho background/cache nhẹ)
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

/* ---------------- Kafka ---------------- */
const brokers = process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(",")
    : [];
if (!brokers.length) throw new Error("FATAL: KAFKA_BROKERS is not defined.");

const kafkaSsl = /^true$/i.test(process.env.KAFKA_SSL || "");
const kafkaSaslMechanism = process.env.KAFKA_SASL_MECHANISM; // plain/scram-sha-256/scram-sha-512
const kafkaSasl =
    kafkaSaslMechanism &&
    process.env.KAFKA_SASL_USERNAME &&
    process.env.KAFKA_SASL_PASSWORD
        ? {
              mechanism: kafkaSaslMechanism,
              username: process.env.KAFKA_SASL_USERNAME,
              password: process.env.KAFKA_SASL_PASSWORD,
          }
        : undefined;

const sessionTimeout = (() => {
    const v = Number.parseInt(process.env.KAFKA_SESSION_TIMEOUT || "", 10);
    return Number.isFinite(v) ? v : 60_000; // 60s
})();
const heartbeatInterval = (() => {
    const v = Number.parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL || "", 10);
    return Number.isFinite(v) ? v : 5_000; // 5s
})();

const config = {
    app: {
        port: Number(process.env.PORT) || 3000,
        nodeEnv: env,
        serviceKey: process.env.SERVICE_SECRET_KEY,
    },

    availability: {
        serverCacheTtlMs: parseInt(
            process.env.AVAILABILITY_CACHE_TTL_MS ?? "0",
            10,
        ),
    },

    redis: redisConfig,

    service_keys: {
        ticket_service: process.env.TICKET_SERVICE_SECRET_KEY,
    },
    service_urls: {
        ticket_service: process.env.TICKET_SERVICE_URL, // TODO: validate URL nếu cần
    },

    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID || "event-service",
        brokers,
        ssl: kafkaSsl || undefined,
        sasl: kafkaSasl, // undefined nếu không cấu hình
        connectionTimeout: Number.parseInt(
            process.env.KAFKA_CONNECTION_TIMEOUT || "3000",
            10,
        ),
        authenticationTimeout: Number.parseInt(
            process.env.KAFKA_AUTH_TIMEOUT || "3000",
            10,
        ),
        retry: {
            initialRetryTime: Number.parseInt(
                process.env.KAFKA_INITIAL_RETRY_TIME || "100",
                10,
            ),
            retries: Number.parseInt(process.env.KAFKA_RETRIES || "5", 10),
        },

        // Consumer defaults (override per-consumer nếu cần)
        sessionTimeout,
        heartbeatInterval,

        producer_name:
            process.env.KAFKA_PRODUCER_SERVICE_NAME || "event-service",

        // ⚠ Đảm bảo đây là TÊN TOPIC (string), không phải enum event-type
        topics: {
            main_events: EVENT_LIFECYCLE_EVENTS, // e.g. "events.lifecycle.v1"
            ticket_type_events: TICKET_TYPES_EVENTS, // e.g. "events.ticket-types.v1"
        },

        // group ids: duy nhất cho service
        consumerGroups: {
            main_events: process.env.KAFKA_GID_MAIN || "event-service-main",
            ticket_type_group:
                process.env.KAFKA_GID_TICKET || "event-service-ticket-type",
            dlq_group: process.env.KAFKA_GID_DLQ || "event-service-dlq",
            global_retry_group:
                process.env.KAFKA_GID_RETRY || "event-service-retry",
        },

        // topics khác
        dlqTopics: {
            main_events_dlq:
                process.env.KAFKA_DLQ_MAIN || "events.lifecycle.v1.dlq",
        },

        // gợi ý cấu hình partitions/replication mặc định cho ensureTopicsExist
        defaults: {
            replicationFactor: Number.parseInt(
                process.env.KAFKA_REPL_FACTOR || (isProduction ? "3" : "1"),
                10,
            ),
            partitions: Number.parseInt(
                process.env.KAFKA_DEFAULT_PARTITIONS || "3",
                10,
            ),
            retryRetentionMs: Number.parseInt(
                process.env.KAFKA_RETRY_RETENTION_MS ||
                    String(5 * 24 * 60 * 60 * 1000),
                10,
            ),
            dlqRetentionMs: Number.parseInt(
                process.env.KAFKA_DLQ_RETENTION_MS ||
                    String(30 * 24 * 60 * 60 * 1000),
                10,
            ),
        },
    },
};

export default config;
