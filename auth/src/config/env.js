import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    NODE_ENV: process.env.NODE_ENV,
    SERVICE_NAME: process.env.SERVICE_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PORT: +process.env.PORT || 3000,
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || "user-service",
    KAFKA_BROKERS: process.env.KAFKA_BROKERS || "localhost:9092",
    KAFKA_CONNECTION_TIMEOUT: process.env.KAFKA_CONNECTION_TIMEOUT || "3000",
    KAFKA_AUTH_TIMEOUT: process.env.KAFKA_AUTH_TIMEOUT || "1000",
};
