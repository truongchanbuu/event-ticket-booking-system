export async function shutdownKafka(producer) {
  try {
    await producer.disconnect();
    console.log("[Kafka] Producer disconnected");
  } catch (err) {
    console.error("[Kafka] Error disconnecting producer:", err);
  }
}
