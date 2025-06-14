import { Kafka } from "kafkajs";
import { v4 } from "uuid";

import { ENV } from "../config/env.js";

let kafkaState = {
  instance: null,
  producers: new Map(),
  consumers: new Map(),
  isInitialized: false,
  config: null,
};

// 2. CONFIGURATION
const defaultKafkaConfig = {
  clientId: ENV.KAFKA_CLIENT_ID || "my-app",
  brokers: (ENV.KAFKA_BROKERS || "localhost:9092").split(","),
  connectionTimeout: parseInt(ENV.KAFKA_CONNECTION_TIMEOUT) || 3000,
  authenticationTimeout: parseInt(ENV.KAFKA_AUTH_TIMEOUT) || 1000,
  retry: {
    initialRetryTime: 100,
    retries: 5,
  },
};

// 3. CORE FUNCTIONS

/**
 * Initialize Kafka instance - pure function
 * @param {Object} config - Kafka configuration
 * @returns {Object} Kafka instance
 */
function initKafka(config) {
  if (kafkaState.instance) {
    console.warn("Kafka already initialized");
    return kafkaState.instance;
  }

  const kafka = new Kafka({
    ...defaultKafkaConfig,
    ...config,
  });

  kafkaState = {
    ...kafkaState,
    instance: kafka,
    isInitialized: true,
    config,
  };

  console.log("Kafka initialized with config:", {
    clientId: config.clientId,
    brokers: config.brokers,
  });

  return kafka;
}

/**
 * Get Kafka instance
 * @returns {Object} Kafka instance
 */
function getKafka() {
  if (!kafkaState.isInitialized) {
    throw new Error("Kafka not initialized. Call initKafka() first");
  }
  return kafkaState.instance;
}

/**
 * Create or get cached producer
 * @param {string} producerId - Unique producer identifier
 * @param {Object} options - Producer options
 * @returns {Promise<Object>} Kafka producer
 */
async function getProducer(producerId = "default", options = {}) {
  if (kafkaState.producers.has(producerId)) {
    return kafkaState.producers.get(producerId);
  }

  const kafka = getKafka();
  const producer = kafka.producer({
    maxInFlightRequests: 1,
    idempotent: true,
    transactionTimeout: 30000,
    ...options,
  });

  await producer.connect();
  kafkaState.producers.set(producerId, producer);

  console.log(`Producer '${producerId}' created and connected`);
  return producer;
}

/**
 * Create or get cached consumer
 * @param {string} groupId - Consumer group ID
 * @param {string} consumerId - Consumer identifier
 * @param {Object} options - Consumer options
 * @returns {Promise<Object>} Kafka consumer
 */
async function getConsumer(groupId, consumerId = null, options = {}) {
  const key = consumerId || groupId;

  if (kafkaState.consumers.has(key)) {
    return kafkaState.consumers.get(key);
  }

  const kafka = getKafka();
  const consumer = kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
    ...options,
  });

  await consumer.connect();
  kafkaState.consumers.set(key, consumer);

  console.log(`Consumer '${key}' created and connected`);
  return consumer;
}

/**
 * Generic send message function
 * @param {Object} params - Message parameters
 * @returns {Promise<Object>} Send result
 */
async function sendMessage({
  topic,
  key,
  value,
  headers = {},
  eventType = "GENERIC_EVENT",
  source = "application",
  producerId = "default",
  partition,
  timestamp,
}) {
  // Validation
  validateMessageParams({ topic, key, value });

  const producer = await getProducer(producerId);

  // Create standardized message
  const message = createStandardMessage({
    key,
    value,
    headers,
    eventType,
    source,
    partition,
    timestamp,
  });

  try {
    const result = await producer.send({
      topic,
      messages: [message],
    });

    console.log("Message sent:", {
      topic,
      key,
      eventType,
      partition: result[0].partition,
      offset: result[0].offset,
    });

    return {
      success: true,
      topic,
      key,
      eventType,
      partition: result[0].partition,
      offset: result[0].offset,
      messageId: message.headers.messageId,
    };
  } catch (error) {
    console.error("Send message failed:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

/**
 * Send multiple messages in batch
 * @param {string} topic - Topic name
 * @param {Array} messages - Array of message objects
 * @param {string} producerId - Producer ID
 * @returns {Promise<Object>} Batch result
 */
async function sendBatchMessages(topic, messages, producerId = "default") {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages must be a non-empty array");
  }

  const producer = await getProducer(producerId);

  const kafkaMessages = messages.map((msg) =>
    createStandardMessage({
      key: msg.key,
      value: msg.value,
      headers: msg.headers || {},
      eventType: msg.eventType || "BATCH_EVENT",
      source: msg.source || "application",
    })
  );

  try {
    const result = await producer.send({
      topic,
      messages: kafkaMessages,
    });

    console.log(`Batch sent: ${messages.length} messages to ${topic}`);

    return {
      success: true,
      topic,
      messageCount: messages.length,
      results: result,
    };
  } catch (error) {
    console.error("Batch send failed:", error);
    throw new Error(`Batch send failed: ${error.message}`);
  }
}

/**
 * Subscribe and consume messages
 * @param {Object} params - Consumer parameters
 * @returns {Promise<void>}
 */
async function consumeMessages({
  groupId,
  topics,
  fromBeginning = false,
  messageHandler,
  consumerId = null,
  options = {},
}) {
  if (typeof messageHandler !== "function") {
    throw new Error("messageHandler must be a function");
  }

  const consumer = await getConsumer(groupId, consumerId, options);

  await consumer.subscribe({
    topics: Array.isArray(topics) ? topics : [topics],
    fromBeginning,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const parsedMessage = parseMessage(message);
        await messageHandler({
          topic,
          partition,
          offset: message.offset,
          ...parsedMessage,
        });
      } catch (error) {
        console.error("Message processing error:", error);
        // Could implement dead letter queue here
      }
    },
  });

  console.log(`Consumer started for topics: ${topics}`);
}

// 4. UTILITY FUNCTIONS

/**
 * Create standardized message format
 */
function createStandardMessage({
  key,
  value,
  headers = {},
  eventType,
  source,
  partition,
  timestamp,
}) {
  const messageId = headers.messageId || v4();
  const messageTimestamp = timestamp || Date.now();

  const standardHeaders = {
    messageId,
    eventType,
    source,
    contentType: "application/json",
    timestamp: messageTimestamp.toString(),
    ...headers,
  };

  const message = {
    key: key?.toString(),
    value: typeof value === "string" ? value : JSON.stringify(value),
    headers: standardHeaders,
    timestamp: messageTimestamp,
  };

  if (partition !== undefined) {
    message.partition = partition;
  }

  return message;
}

/**
 * Parse incoming message
 */
function parseMessage(message) {
  const headers = {};
  Object.keys(message.headers || {}).forEach((key) => {
    headers[key] = message.headers[key].toString();
  });

  let value;
  try {
    value = JSON.parse(message.value.toString());
  } catch {
    value = message.value.toString();
  }

  return {
    key: message.key?.toString(),
    value,
    headers,
    timestamp: message.timestamp,
    eventType: headers.eventType,
    source: headers.source,
    messageId: headers.messageId,
  };
}

/**
 * Validate message parameters
 */
function validateMessageParams({ topic, key, value }) {
  if (!topic) throw new Error("Topic is required");
  if (key === undefined || key === null) throw new Error("Key is required");
  if (value === undefined || value === null)
    throw new Error("Value is required");

  if (!/^[a-zA-Z0-9._-]+$/.test(topic)) {
    throw new Error("Invalid topic format");
  }
}

/**
 * Cleanup all connections
 * @returns {Promise<void>}
 */
async function disconnectKafka() {
  try {
    const producerPromises = Array.from(kafkaState.producers.values()).map(
      (producer) => producer.disconnect()
    );

    const consumerPromises = Array.from(kafkaState.consumers.values()).map(
      (consumer) => consumer.disconnect()
    );

    await Promise.all([...producerPromises, ...consumerPromises]);

    // Reset state
    kafkaState = {
      instance: null,
      producers: new Map(),
      consumers: new Map(),
      isInitialized: false,
      config: null,
    };

    console.log("All Kafka connections closed");
  } catch (error) {
    console.error("Kafka cleanup error:", error);
    throw error;
  }
}

/**
 * Health check
 * @returns {Promise<Object>} Health status
 */
async function checkKafkaHealth() {
  if (!kafkaState.isInitialized) {
    return { status: "not_initialized" };
  }

  try {
    const admin = kafkaState.instance.admin();
    await admin.connect();
    const metadata = await admin.fetchTopicMetadata();
    await admin.disconnect();

    return {
      status: "healthy",
      brokers: metadata.brokers.length,
      topics: metadata.topics.length,
      producers: kafkaState.producers.size,
      consumers: kafkaState.consumers.size,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
    };
  }
}

// 5. HIGHER-ORDER FUNCTIONS FOR COMMON PATTERNS

/**
 * Create a retry wrapper
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Max retry attempts
 * @param {number} delay - Delay between retries
 * @returns {Function} Wrapped function with retry logic
 */
function withRetry(fn, maxRetries = 3, delay = 1000) {
  return async function (...args) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          await sleep(delay * attempt);
        }
      }
    }

    throw new Error(
      `Failed after ${maxRetries} attempts: ${lastError.message}`
    );
  };
}

/**
 * Create a message sender with predefined config
 * @param {Object} config - Default message config
 * @returns {Function} Configured send function
 */
function createMessageSender(config) {
  return function (messageData) {
    return sendMessage({
      ...config,
      ...messageData,
    });
  };
}

/**
 * Create topic-specific sender
 * @param {string} topic - Topic name
 * @param {string} eventType - Event type
 * @param {string} source - Source service
 * @returns {Function} Topic-specific sender
 */
export function createTopicSender(topic, eventType, source) {
  return createMessageSender({ topic, eventType, source });
}

// 6. DOMAIN-SPECIFIC FUNCTIONS

// Order domain functions
const sendOrderEvent = createTopicSender(
  "order-events",
  "ORDER_EVENT",
  "order-service"
);
const sendOrderCreated = (orderData) =>
  sendOrderEvent({
    key: orderData.orderId,
    value: { ...orderData, createdAt: new Date().toISOString() },
    eventType: "ORDER_CREATED",
  });

const sendOrderCancelled = (orderData) =>
  sendOrderEvent({
    key: orderData.orderId,
    value: { ...orderData, cancelledAt: new Date().toISOString() },
    eventType: "ORDER_CANCELLED",
  });

// 7. GRACEFUL SHUTDOWN SETUP
export async function setupGracefulShutdown({ disconnect = async () => {} }) {
  const gracefulShutdown = async (signal) => {
    console.log(`\n🔌 Received ${signal}, shutting down gracefully...`);

    try {
      await disconnect(); // disconnectKafka được truyền vào
      console.log("✅ Graceful shutdown completed.");
      process.exit(0);
    } catch (error) {
      console.error("❌ Shutdown error:", error);
      process.exit(1);
    }
  };

  ["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) =>
    process.on(signal, gracefulShutdown)
  );
}

// 8. UTILITY FUNCTIONS
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry-enabled functions
const sendMessageWithRetry = withRetry(sendMessage, 3, 1000);
const sendBatchWithRetry = withRetry(sendBatchMessages, 3, 1000);

// 9. USAGE EXAMPLES

async function exampleUsage() {
  try {
    // Initialize once at app startup
    initKafka();
    setupGracefulShutdown();

    // Send user events
    await sendUserDeleted({
      userId: "123",
      email: "user@example.com",
      deletedBy: "admin",
      reason: "GDPR_REQUEST",
    });

    await sendUserCreated({
      userId: "456",
      email: "newuser@example.com",
      plan: "premium",
    });

    // Send order events
    await sendOrderCreated({
      orderId: "order-789",
      userId: "123",
      amount: 99.99,
      items: ["item1", "item2"],
    });

    // Batch send
    await sendBatchMessages("analytics-events", [
      {
        key: "event1",
        value: { type: "click", page: "home" },
        eventType: "USER_INTERACTION",
      },
      {
        key: "event2",
        value: { type: "view", page: "product" },
        eventType: "USER_INTERACTION",
      },
    ]);

    // Start consumer
    await consumeMessages({
      groupId: "notification-group",
      topics: ["user-events", "order-events"],
      messageHandler: async (message) => {
        console.log(`Processing ${message.eventType}:`, message.value);

        // Handle different event types
        switch (message.eventType) {
          case "USER_DELETED":
            console.log(`Send deletion notification to ${message.value.email}`);
            break;
          case "ORDER_CREATED":
            console.log(`Send order confirmation for ${message.value.orderId}`);
            break;
          default:
            console.log(`Unknown event: ${message.eventType}`);
        }
      },
    });

    // Health check
    const health = await checkKafkaHealth();
    console.log("Kafka health:", health);
  } catch (error) {
    console.error("Example usage error:", error);
  }
}

// EXPORTS
export default {
  // Core functions
  initKafka,
  getKafka,
  getProducer,
  getConsumer,
  sendMessage,
  sendBatchMessages,
  consumeMessages,
  disconnectKafka,
  checkKafkaHealth,

  // Utility functions
  withRetry,
  createMessageSender,
  createTopicSender,
  setupGracefulShutdown,

  // Retry-enabled functions
  sendMessageWithRetry,
  sendBatchWithRetry,

  // Example
  exampleUsage,
};
