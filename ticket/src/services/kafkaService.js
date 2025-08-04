// This file initializes and manages the Kafka producer, now with a retry mechanism
// to handle race conditions during startup.

import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'ticket-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();

/**
 * Sends a message to a Kafka topic.
 * @param {string} topic - The topic to send the message to.
 * @param {Array<Object>} messages - The array of messages to send.
 */
export const sendKafkaMessage = async (topic, messages) => {
  try {
    await producer.send({
      topic,
      messages,
    });
    console.log(`Message sent to topic "${topic}".`);
  } catch (error) {
    console.error('Error sending message to Kafka:', error);
  }
};

export const connectProducer = async () => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 2000; // 2 seconds

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await producer.connect();
      console.log('Kafka producer connected successfully.');
      return; // Exit the loop on success
    } catch (error) {
      console.error(`Failed to connect to Kafka producer (Attempt ${i + 1}/${MAX_RETRIES}):`, error);
      if (i < MAX_RETRIES - 1) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        // If all retries fail, re-throw the error
        throw new Error('Failed to connect to Kafka producer after multiple retries.');
      }
    }
  }
};

/**
 * Disconnects the Kafka producer.
 */
export const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    console.log('Kafka producer disconnected.');
  } catch (error) {
    console.error('Failed to disconnect Kafka producer:', error);
  }
};
