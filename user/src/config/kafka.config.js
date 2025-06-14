import { ENV } from "./env.js";

const kafkaConfig = {
    clientId: ENV.KAFKA_CLIENT_ID || "my-app",
};

export default kafkaConfig;
