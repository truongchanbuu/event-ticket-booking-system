import "dotenv/config";
export default {
    app: {
        port: process.env.PORT || 3000,
        node_env: process.env.NODE_ENV || "development",
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
    },

    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: process.env.KAFKA_BROKERS.split(","),
        connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10),
        authenticationTimeout: parseInt(process.env.KAFKA_AUTH_TIMEOUT, 10),
        retry: {
            initialRetryTime: 100,
            retries: 5,
        },
    },
};
