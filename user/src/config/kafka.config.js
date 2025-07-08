import { ENV } from "./env.js";

const kafkaConfig = {
    clientId: ENV.KAFKA_CLIENT_ID,
    brokers: ENV.KAFKA_BROKERS.split(","),
    connectionTimeout: parseInt(ENV.KAFKA_CONNECTION_TIMEOUT),
    authenticationTimeout: parseInt(ENV.KAFKA_AUTH_TIMEOUT),
    retry: {
        initialRetryTime: 100,
        retries: 5,
    },
};

export default kafkaConfig;
