import { Kafka } from "kafkajs";
import config from "../config/index.js";

class KafkaService {
    constructor() {
        this.kafka = null;
        this.producer = null;
        this.consumers = new Map();
        this.isConnected = false;
    }

    /**
     * Initialize Kafka connection
     */
    async initialize() {
        try {
            console.log("Initializing Kafka connection...");
            console.log("Kafka config:", {
                clientId: config.kafka.clientId,
                brokers: config.kafka.brokers,
            });

            this.kafka = new Kafka(config.kafka);

            // Initialize producer
            this.producer = this.kafka.producer({
                maxInFlightRequests: 1,
                idempotent: true,
                transactionTimeout: 30000,
            });

            await this.producer.connect();
            this.isConnected = true;

            console.log("✅ Kafka connection established successfully");
            return true;
        } catch (error) {
            console.error("❌ Failed to connect to Kafka:", error.message);
            throw error;
        }
    }

    /**
     * Send message to Kafka topic
     */
    async sendMessage(topic, message) {
        if (!this.isConnected) {
            throw new Error("Kafka not connected. Call initialize() first");
        }

        try {
            const result = await this.producer.send({
                topic,
                messages: [
                    {
                        key: message.key || "default-key",
                        value: JSON.stringify(message.value),
                        headers: message.headers || {},
                    },
                ],
            });

            console.log(`✅ Message sent to topic '${topic}':`, {
                partition: result[0].partition,
                offset: result[0].offset,
            });

            return result;
        } catch (error) {
            console.error(
                `❌ Failed to send message to topic '${topic}':`,
                error.message,
            );
            throw error;
        }
    }

    /**
     * Create consumer for a topic
     */
    async createConsumer(groupId, topic, messageHandler) {
        if (!this.isConnected) {
            throw new Error("Kafka not connected. Call initialize() first");
        }

        try {
            const consumer = this.kafka.consumer({
                groupId,
                sessionTimeout: 30000,
                rebalanceTimeout: 60000,
                heartbeatInterval: 3000,
            });

            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const value = JSON.parse(message.value.toString());
                        console.log(
                            `📨 Received message from topic '${topic}':`,
                            {
                                partition,
                                offset: message.offset,
                                key: message.key?.toString(),
                            },
                        );

                        await messageHandler(value, message);
                    } catch (error) {
                        console.error("❌ Error processing message:", error);
                    }
                },
            });

            this.consumers.set(groupId, consumer);
            console.log(
                `✅ Consumer created for topic '${topic}' with group '${groupId}'`,
            );

            return consumer;
        } catch (error) {
            console.error(
                `❌ Failed to create consumer for topic '${topic}':`,
                error.message,
            );
            throw error;
        }
    }

    /**
     * Disconnect from Kafka
     */
    async disconnect() {
        try {
            if (this.producer) {
                await this.producer.disconnect();
                console.log("✅ Producer disconnected");
            }

            for (const [groupId, consumer] of this.consumers) {
                await consumer.disconnect();
                console.log(`✅ Consumer '${groupId}' disconnected`);
            }

            this.consumers.clear();
            this.isConnected = false;
            console.log("✅ Kafka service disconnected");
        } catch (error) {
            console.error("❌ Error disconnecting from Kafka:", error.message);
            throw error;
        }
    }

    /**
     * Check Kafka health
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    status: "disconnected",
                    message: "Kafka not connected",
                };
            }

            // Try to send a test message to check connectivity
            await this.producer.send({
                topic: "__health_check__",
                messages: [{ key: "health", value: "ping" }],
            });

            return {
                status: "healthy",
                message: "Kafka connection is working",
            };
        } catch (error) {
            return { status: "unhealthy", message: error.message };
        }
    }
}

// Create singleton instance
const kafkaService = new KafkaService();

export default kafkaService;
