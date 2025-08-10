import dotenv from "dotenv";
import path from "path";
import { redisConfig } from "../../../shared/config/index.js";

const env = process.env.NODE_ENV || "development";
const envFile = `.env`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const isProduction = env === "production";

const config = {
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: env,
        serviceKey: process.env.SERVICE_SECRET_KEY,
    },
    redis: redisConfig,
    service_keys: {},
    service_urls: {},
};

// console.log(`${config.kafka.brokers} - ${process.env.KAFKA_BROKERS}`);
// if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
//   throw new Error('FATAL ERROR: KAFKA_BROKERS is not defined.');
// }

export default config;
