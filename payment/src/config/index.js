import dotenv from "dotenv";
import path from "path";
import { redisConfig } from "../../../shared/config/index.js";
import { TOPICS } from "@event_ticket_booking_system/shared";

const env = process.env.NODE_ENV || "development";
const envFile = `.env`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const isProduction = env === "production";

const config = {
    app: {
        port: process.env.PORT || 3000,
        nodeEnv: env,
        serviceKey: process.env.SERVICE_SECRET_KEY,
        url: process.env.SELF_URL,
    },

    redis: redisConfig,
    paymentClients: {
        momo: {
            mode: process.env.MOMO_MODE || "mock", // mock | merchant
            partnerCode: process.env.MOMO_PARTNER_CODE || "MOCK_GLOBAL",
            accessKey: process.env.MOMO_ACCESS_KEY || "demo_access",
            secretKey: process.env.MOMO_SECRET_KEY || "demo_secret",
            endpoint: isProduction
                ? "https://payment.momo.vn"
                : "https://test-payment.momo.vn",
            returnUrl: `${process.env.WEB_BASE_URL}/checkout/result`,
            ipnUrl: `${process.env.PUBLIC_BASE_URL}/api/payment/momo/ipn`,
            timeoutMs: 5000,
            captureType: "captureWallet",
            signature: "HMAC_SHA256",
        },
    },
    serviceKeys: {},
    serviceUrls: {},
    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: process.env.KAFKA_BROKERS
            ? process.env.KAFKA_BROKERS.split(",")
            : [],
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
        sessionTimeout: 300000,
        heartbeatInterval: 10000,
        producerName: process.env.KAFKA_PRODUCER_SERVICE_NAME || "app",
        topics: {
            event_lifecycle: TOPICS.PAYMENT,
        },
        consumerGroups: {
            main_events: "payment-service-main-group",
            dlq_group: "payment-service-dlq",
            global_retry_group: "payment-service-global-retry-handler",
        },
        dlqTopics: {
            main_tickets_dlq: "payment-service.main.dlq",
        },
    },
};

// console.log(`${config.kafka.brokers} - ${process.env.KAFKA_BROKERS}`);
// if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
//   throw new Error('FATAL ERROR: KAFKA_BROKERS is not defined.');
// }

export default config;
