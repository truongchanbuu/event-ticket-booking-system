import kafka from "./kafka.js";

let producer;
let isConnected = false;

export async function initProducer() {
  if (!producer) {
    producer = kafka.producer();
  }

  if (!isConnected) {
    await producer.connect();
    isConnected = true;
  }

  return producer;
}

export async function sendKafkaMessage({ topic, key, value }) {
  const prod = await initProducer();
  await prod.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(value),
      },
    ],
  });
}
