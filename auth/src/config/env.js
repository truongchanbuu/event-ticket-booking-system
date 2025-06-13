import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    NODE_ENV: process.env.NODE_ENV,
    SERVICE_NAME: process.env.SERVICE_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PORT: +process.env.PORT || 3000,
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
};
