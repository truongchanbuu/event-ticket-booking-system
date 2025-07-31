import { Kafka } from "kafkajs";
import {
  rootLogger,
  createChildLogger,
  toPinoLogLevel,
} from "../logger/index.js";

export class KafkaService {
  /** @private */
  kafka;
  /** @private */
  producer;
  /** @private */
  admin;
  /** @private @type {Map<string, import('kafkajs').Consumer>} */
  consumers = new Map();

  /** @private @type {'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'} */
  connectionState = "DISCONNECTED";
  /** @private @type {Promise<void> | null} */
  connectionPromise = null;

  constructor({ config }) {
    this.kafka = new Kafka({
      ...config,
      logCreator: (logLevel) => {
        const pinoLevel = toPinoLogLevel(logLevel);
        return ({ namespace, level, label, log }) => {
          const { message, ...extra } = log;
          rootLogger[pinoLevel](
            { kafka: { namespace, label, ...extra } },
            message
          );
        };
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      retry: 1,
    });

    this.admin = this.kafka.admin();
    this.logger = rootLogger.child({ service: "KafkaService" });
  }

  /**
   * Khởi tạo kết nối một cách an toàn, tránh race condition.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.connectionState === "CONNECTED") {
      return;
    }
    if (this.connectionState === "CONNECTING") {
      return this.connectionPromise;
    }

    this.logger.info("KafkaService is connecting...");
    this.connectionState = "CONNECTING";

    this.connectionPromise = (async () => {
      try {
        await this.admin.connect();
        await this.producer.connect();
        this.connectionState = "CONNECTED";
        this.logger.info("✅ KafkaService connected successfully.");
      } catch (error) {
        this.connectionState = "DISCONNECTED";
        this.logger.error("❌ Failed to connect KafkaService.", {
          error: error.message,
        });
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Gửi một hoặc nhiều tin nhắn tới một topic.
   * @param {string} topic - Topic đích.
   * @param {Array<{key?: string, value: any, headers?: object}>} messages - Mảng các tin nhắn.
   * @returns {Promise<import('kafkajs').RecordMetadata[]>}
   */
  async send(topic, messages) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected. Call initialize() first.");
    }

    const kafkaMessages = messages.map((msg) => ({
      key: msg.key,
      value:
        typeof msg.value === "string" ? msg.value : JSON.stringify(msg.value),
      headers: msg.headers,
    }));

    try {
      return await this.producer.send({
        topic,
        messages: kafkaMessages,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to send messages to topic '${topic}'`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Tạo consumer và xử lý tin nhắn, tích hợp Dead Letter Queue (DLQ).
   * @param {string} groupId - ID của consumer group.
   * @param {string} topic - Topic để lắng nghe.
   * @param {(value: any, payload: import('kafkajs').EachMessagePayload) => Promise<void>} handler - Hàm xử lý mỗi tin nhắn.
   * @param {string} [dlqTopic] - (Tùy chọn) Topic cho Dead Letter Queue.
   * @param {object} [consumerConfig={}] - (Tùy chọn) Cấu hình thêm cho consumer.
   * @returns {Promise<void>}
   */
  async createConsumer(
    groupId,
    topic,
    handler,
    dlqTopic = undefined,
    consumerConfig = {}
  ) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected. Call initialize() first.");
    }

    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      ...consumerConfig,
    });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload) => {
        const { topic, partition, message } = payload;
        try {
          const value = JSON.parse(message.value.toString());
          this.logger.info(`📨 Received message from topic '${topic}'`, {
            partition,
            offset: message.offset,
            key: message.key?.toString(),
          });
          await handler(value, payload);
        } catch (error) {
          this.logger.error(
            "❌ Error processing message. Potentially moving to DLQ.",
            {
              topic,
              offset: message.offset,
              error: error.message,
            }
          );

          // LOGIC GỬI ĐẾN DEAD LETTER QUEUE
          if (dlqTopic) {
            this.logger.info(`Moving failed message to DLQ topic: ${dlqTopic}`);
            await this.send(dlqTopic, [
              {
                key: message.key,
                value: message.value, // Gửi lại message gốc (dạng buffer/string)
                headers: {
                  ...message.headers,
                  "x-original-topic": topic,
                  "x-error-message": error.message,
                  "x-error-stack": error.stack,
                },
              },
            ]);
          }
        }
      },
    });

    this.consumers.set(groupId, consumer);
    this.logger.info(
      `✅ Consumer created for topic '${topic}' with group '${groupId}'`
    );
  }

  /**
   * Ngắt kết nối Kafka một cách an toàn (graceful shutdown).
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connectionState === "DISCONNECTED") return;

    this.logger.info("KafkaService is disconnecting...");
    try {
      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger.info(`✅ Consumer '${groupId}' disconnected.`);
      }
      this.consumers.clear();

      await this.producer.disconnect();
      this.logger.info("✅ Producer disconnected.");

      await this.admin.disconnect();
      this.logger.info("✅ Admin client disconnected.");

      this.connectionState = "DISCONNECTED";
      this.connectionPromise = null;
      this.logger.info("✅ KafkaService disconnected completely.");
    } catch (error) {
      this.logger.error("❌ Error during Kafka disconnection.", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Liệt kê các topic.
   * @returns {Promise<string[]>}
   */
  async listTopics() {
    if (this.connectionState !== "CONNECTED")
      throw new Error("Kafka not connected");
    return this.admin.listTopics();
  }

  createTopicSender(topic, eventSourceName) {
    // Trả về một hàm async mới
    return async (payload) => {
      if (this.connectionState !== "CONNECTED") {
        this.logger.error(
          { eventSourceName, topic },
          "Cannot send event, Kafka is not connected."
        );
        throw new Error("Kafka is not connected.");
      }

      const { key, value, eventType } = payload;

      if (!eventType) {
        this.logger.warn(
          { eventSourceName, topic },
          "Sending event without an 'eventType'. This is not recommended."
        );
      }

      // Tạo một child logger với context của event này
      const eventLogger = createChildLogger({
        eventSourceName,
        topic,
        eventType,
        messageKey: key,
      });

      try {
        eventLogger.info("Attempting to send event...");
        await this.send(topic, [
          {
            key: key,
            value: value,
            headers: {
              "x-event-type": eventType || "unknown",
              "x-source-service":
                process.env.KAFKA_PRODUCER_SERVICE_NAME || "unknown-service",
            },
          },
        ]);

        eventLogger.info("✅ Event sent successfully.");
      } catch (error) {
        eventLogger.error({ err: error }, "❌ Failed to send event.");
        throw error;
      }
    };
  }
}
