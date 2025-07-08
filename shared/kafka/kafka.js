import { Kafka } from "kafkajs";
import { v4 } from "uuid";

class KafkaManager {
  constructor() {
    this.instance = null;
    this.producers = new Map();
    this.consumers = new Map();
    this.isInitialized = false;
    this.config = null;
  }

  /**
   * Initialize Kafka instance
   * @param {Object} config - Kafka configuration
   * @returns {Object} Kafka instance
   */
  initKafka(config) {
    if (this.instance) {
      console.warn("Kafka already initialized");
      return this.instance;
    }

    console.log("🔍 DEBUG - initKafka called with config:", config);

    // Sử dụng config đơn giản nhất để test
    const finalConfig = {
      clientId: "user-service",
      brokers: ["localhost:9092"],
    };

    console.log("🔍 DEBUG - Final Kafka config:", finalConfig);
    console.log("🔍 DEBUG - Final Kafka config type:", typeof finalConfig);
    console.log(
      "🔍 DEBUG - Final Kafka config JSON:",
      JSON.stringify(finalConfig, null, 2)
    );

    this.instance = new Kafka(finalConfig);
    console.log("🔍 DEBUG - Kafka constructor succeeded");

    console.log("🔍 DEBUG - Kafka instance created:", {
      clientId: this.instance.clientId,
      brokers: this.instance.brokers,
      connectionTimeout: this.instance.connectionTimeout,
    });

    this.isInitialized = true;
    this.config = config;

    console.log("🔍 DEBUG - Kafka instance after saving to state:", {
      clientId: this.instance.clientId,
      brokers: this.instance.brokers,
      connectionTimeout: this.instance.connectionTimeout,
    });

    console.log("Kafka initialized with config:", {
      clientId: config.clientId,
      brokers: config.brokers,
    });

    return this.instance;
  }

  /**
   * Get Kafka instance
   * @returns {Object} Kafka instance
   */
  getKafka() {
    if (!this.isInitialized) {
      throw new Error("Kafka not initialized. Call initKafka() first");
    }
    return this.instance;
  }

  /**
   * Create or get cached producer
   * @param {string} producerId - Unique producer identifier
   * @param {Object} options - Producer options
   * @returns {Promise<Object>} Kafka producer
   */
  async getProducer(producerId = "default", options = {}) {
    if (this.producers.has(producerId)) {
      return this.producers.get(producerId);
    }

    const kafka = this.getKafka();
    console.log("🔍 DEBUG - Kafka instance config:", {
      clientId: kafka.clientId,
      brokers: kafka.brokers,
      connectionTimeout: kafka.connectionTimeout,
    });

    const producer = kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
      ...options,
    });

    console.log("🔍 DEBUG - About to connect producer...");
    await producer.connect();
    console.log("🔍 DEBUG - Producer connected successfully!");

    this.producers.set(producerId, producer);

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
  async getConsumer(groupId, consumerId = null, options = {}) {
    const key = consumerId || groupId;

    if (this.consumers.has(key)) {
      return this.consumers.get(key);
    }

    const kafka = this.getKafka();
    const consumer = kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      ...options,
    });

    await consumer.connect();
    this.consumers.set(key, consumer);

    console.log(`Consumer '${key}' created and connected`);
    return consumer;
  }

  /**
   * Generic send message function
   * @param {Object} params - Message parameters
   * @returns {Promise<Object>} Send result
   */
  async sendMessage({
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
    this.validateMessageParams({ topic, key, value });

    const producer = await this.getProducer(producerId);

    // Create standardized message
    const message = this.createStandardMessage({
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
  async sendBatchMessages(topic, messages, producerId = "default") {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages must be a non-empty array");
    }

    const producer = await this.getProducer(producerId);

    const kafkaMessages = messages.map((msg) =>
      this.createStandardMessage({
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
  async consumeMessages({
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

    const consumer = await this.getConsumer(groupId, consumerId, options);

    await consumer.subscribe({
      topics: Array.isArray(topics) ? topics : [topics],
      fromBeginning,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const parsedMessage = this.parseMessage(message);
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

  /**
   * Create standardized message format
   */
  createStandardMessage({
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
  parseMessage(message) {
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
  validateMessageParams({ topic, key, value }) {
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
  async disconnect() {
    try {
      const producerPromises = Array.from(this.producers.values()).map(
        (producer) => producer.disconnect()
      );

      const consumerPromises = Array.from(this.consumers.values()).map(
        (consumer) => consumer.disconnect()
      );

      await Promise.all([...producerPromises, ...consumerPromises]);

      // Reset state
      this.instance = null;
      this.producers.clear();
      this.consumers.clear();
      this.isInitialized = false;
      this.config = null;

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
  async healthCheck() {
    if (!this.isInitialized) {
      return { status: "not_initialized" };
    }

    try {
      const admin = this.instance.admin();
      await admin.connect();
      const metadata = await admin.fetchTopicMetadata();
      await admin.disconnect();

      return {
        status: "healthy",
        brokers: metadata.brokers.length,
        topics: metadata.topics.length,
        producers: this.producers.size,
        consumers: this.consumers.size,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  /**
   * Create a retry wrapper
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Max retry attempts
   * @param {number} delay - Delay between retries
   * @returns {Function} Wrapped function with retry logic
   */
  static withRetry(fn, maxRetries = 3, delay = 1000) {
    return async function (...args) {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed:`, error.message);

          if (attempt < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, delay * attempt)
            );
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
  static createMessageSender(config) {
    return (messageData) => {
      return kafkaManager.sendMessage({
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
  static createTopicSender(topic, eventType, source) {
    return KafkaManager.createMessageSender({ topic, eventType, source });
  }

  /**
   * Utility function for sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔌 Received ${signal}, shutting down gracefully...`);

      try {
        await this.disconnect();
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
}

// Create singleton instance
const kafkaManager = new KafkaManager();

// Export singleton instance and class
export default kafkaManager;
export { KafkaManager };
