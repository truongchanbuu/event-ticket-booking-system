import "dotenv/config";
export default {
    redis: {
        prefix: process.env.REDIS_PREFIX || "app",
        defaultTTL: process.env.REDIS_TTL || 300,
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
