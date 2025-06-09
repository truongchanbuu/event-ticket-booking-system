import producer from "./procuder.js";

export async function shutdownKafka() {
    try {
        await producer.disconnect();
        console.log("[Kafka] Producer disconnected");
    } catch (err) {
        console.error("[Kafka] Error disconnecting producer:", err);
    }
}
