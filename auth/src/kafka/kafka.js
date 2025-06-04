import { Kafka } from "kafkajs";
import { ENV } from "../config/env.js";

const kafka = new Kafka({
    clientId: ENV.SERVICE_NAME,
    brokers: [ENV.KAFKA_BROKER_1],
    retry: {
        retries: 5,
    },
});

export const checkKafka = async () => {
    const admin = kafka.admin();
    try {
        await admin.connect();
        await admin.listTopics();
        return { status: "connected" };
    } catch (e) {
        return { status: "disconnected", error: e.message };
    } finally {
        await admin.disconnect();
    }
};

export default kafka;
