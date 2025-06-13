import kafka from "./kafka.js";

export async function initConsumer({ groupId, topic, handler }) {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (message.value) {
        const parsed = JSON.parse(message.value.toString());
        await handler(parsed);
      }
    },
  });

  return consumer;
}
