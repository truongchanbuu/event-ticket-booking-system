import { ENV } from "./env.js";

export default kafkaConfig = {
    clientId: ENV.KAFKA_CLIENT_ID || "my-app",
};
