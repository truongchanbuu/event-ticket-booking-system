import "dotenv/config";
export default {
    app: {
        port: process.env.PORT,
        nodeEnv: process.env.NODE_ENV,
    },

    redis: {
        prefix: process.env.REDIS_PREFIX || "app",
        defaultTTL: process.env.REDIS_TTL || 300,
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
    },
};
