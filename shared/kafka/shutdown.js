import producer from "./producer.js";

export async function shutdownKafka() {
  try {
    await producer.disconnect();
    console.log("[Kafka] Producer disconnected");
  } catch (err) {
    console.error("[Kafka] Error disconnecting producer:", err);
  }
}
