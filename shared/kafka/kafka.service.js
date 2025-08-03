import { Kafka } from "kafkajs";
import ms from "ms";

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

  constructor({ config, logger }) {
    this.kafka = new Kafka({
      ...config,
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      retry: 1,
    });

    this.admin = this.kafka.admin();
    this.logger = logger;
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

    this.logger?.info("KafkaService is connecting...");
    this.connectionState = "CONNECTING";

    this.connectionPromise = (async () => {
      try {
        await this.admin.connect();
        await this.producer.connect();
        this.connectionState = "CONNECTED";
        this.logger?.info("✅ KafkaService connected successfully.");
      } catch (error) {
        this.connectionState = "DISCONNECTED";
        this.logger?.error("❌ Failed to connect KafkaService.", {
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
      this.logger?.error(`❌ Failed to send messages to topic '${topic}'`, {
        error: error.message,
      });
      throw error;
    }
  }

  async createConsumer({
    groupId,
    topic,
    handler,
    retryDelays,
    dlqTopic,
    consumerConfig = {},
  }) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected. Call initialize() first.");
    }

    const consumer = this.kafka.consumer({ groupId, ...consumerConfig });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    await consumer.run({
      eachMessage: async (payload) => {
        try {
          await handler(payload);
        } catch (error) {
          this.logger?.error(
            `Handler failed for message. Initiating retry/DLQ process.`,
            {
              topic: payload.topic,
              offset: payload.message.offset,
              error: error.message,
            }
          );
          await this.publishToNextTopic(
            payload,
            error,
            topic,
            retryDelays,
            dlqTopic
          );
        }
      },
    });

    this.consumers.set(groupId, consumer);
    this.logger?.info(
      `✅ Retrying consumer created for topic '${topic}' with group '${groupId}'`
    );
  }

  /**
   * @private
   * Logic để đẩy tin nhắn đến topic retry hoặc DLQ tiếp theo.
   */
  async publishToNextTopic(
    payload,
    error,
    originalTopic,
    retryDelays,
    dlqTopic
  ) {
    const { message } = payload;
    const headers = message.headers || {};
    const attempt = headers["x-retry-attempt"]
      ? parseInt(headers["x-retry-attempt"].toString(), 10)
      : 0;

    let nextTopic;
    if (attempt < retryDelays.length) {
      nextTopic = `${originalTopic}.retry.${retryDelays[attempt]}`;
    } else {
      nextTopic = dlqTopic;
    }

    if (!nextTopic) {
      this.logger?.error(
        "No more retry topics and no DLQ configured. Message will be dropped.",
        {
          offset: message.offset,
        }
      );
      return;
    }

    this.logger?.log(`Moving message to topic: ${nextTopic}`, {
      attempt: attempt + 1,
    });

    await this.send(nextTopic, [
      {
        key: message.key,
        value: message.value,
        headers: {
          ...headers,
          "x-original-topic": originalTopic,
          "x-retry-attempt": (attempt + 1).toString(),
          "x-failure-reason": error.message,
        },
      },
    ]);
  }

  /**
   * Tạo một consumer duy nhất để xử lý tất cả các topic retry.
   * @param {object} config
   * @param {string} config.groupId - Group ID cho consumer retry.
   * @param {string} config.originalTopic - Topic gốc để suy ra các topic retry.
   * @param {string[]} config.retryDelays - Mảng thời gian chờ, phải khớp với consumer chính.
   */
  async createGlobalRetryHandlerConsumer({ groupId, retryConfigs }) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected");
    }

    // Từ mảng cấu hình, tạo ra một danh sách phẳng tất cả các topic retry cần lắng nghe
    const allRetryTopics = retryConfigs.flatMap((rc) =>
      rc.retryDelays.map((delay) => `${rc.originalTopic}.retry.${delay}`)
    );

    if (allRetryTopics.length === 0) {
      this.logger?.warn(
        "No retry topics configured for the global retry handler."
      );
      return;
    }

    const sleep = (duration) =>
      new Promise((resolve) => setTimeout(resolve, duration));
    const consumer = this.kafka.consumer({ groupId });

    await consumer.connect();
    await consumer.subscribe({ topics: allRetryTopics, fromBeginning: true });

    this.logger?.info(
      `✅ Global Retry Handler consumer listening to ${
        allRetryTopics.length
      } topics: [${allRetryTopics.join(", ")}]`
    );

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const delayString = topic.split(".").pop();
        const delayMs = ms(delayString);

        this.logger?.info(
          `Received message from retry topic '${topic}'. Waiting for ${delayString}...`
        );
        await sleep(delayMs);

        const originalTargetTopic =
          message.headers["x-original-topic"]?.toString();
        if (!originalTargetTopic) {
          this.logger?.error(
            "Cannot re-drive message, 'x-original-topic' header is missing."
          );
          return;
        }

        this.logger?.info(
          `Re-driving message back to original topic: ${originalTargetTopic}`
        );
        await this.send(originalTargetTopic, [
          {
            key: message.key,
            value: message.value,
            headers: message.headers,
          },
        ]);
      },
    });

    this.consumers.set(groupId, consumer);
  }

  /**
   * Đảm bảo rằng các topic cần thiết đã tồn tại. Nếu chưa, sẽ tự động tạo chúng.
   * @param {Array<{topic: string, numPartitions?: number, replicationFactor?: number}>} topicsToEnsure - Mảng các đối tượng cấu hình topic.
   * @returns {Promise<void>}
   */
  async ensureTopicsExist(topicsToEnsure) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error(
        "Kafka not connected. Call initialize() or ensureTopicsExist() must be called after initialize()."
      );
    }

    if (!topicsToEnsure || topicsToEnsure.length === 0) {
      return;
    }

    this.logger?.info("Ensuring required topics exist...", {
      topics: topicsToEnsure.map((t) => t.topic),
    });

    try {
      await this.admin.createTopics({
        validateOnly: false,
        waitForLeaders: true,
        topics: topicsToEnsure.map((t) => ({
          topic: t.topic,
          numPartitions: t.numPartitions || 1,
          replicationFactor: t.replicationFactor || 1,
        })),
      });
      this.logger?.info("✅ All topics are ready.");
    } catch (error) {
      if (error.name === "TopicAlreadyExistsError") {
        this.logger?.warn("Topics already exist, which is fine.");
        return;
      }

      this.logger?.error("❌ Failed to create topics.", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Ngắt kết nối Kafka một cách an toàn (graceful shutdown).
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connectionState === "DISCONNECTED") return;

    this.logger?.info("KafkaService is disconnecting...");
    try {
      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger?.info(`✅ Consumer '${groupId}' disconnected.`);
      }
      this.consumers.clear();

      await this.producer.disconnect();
      this.logger?.info("✅ Producer disconnected.");

      await this.admin.disconnect();
      this.logger?.info("✅ Admin client disconnected.");

      this.connectionState = "DISCONNECTED";
      this.connectionPromise = null;
      this.logger?.info("✅ KafkaService disconnected completely.");
    } catch (error) {
      this.logger?.error("❌ Error during Kafka disconnection.", {
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
        this.logger?.error(
          { eventSourceName, topic },
          "Cannot send event, Kafka is not connected."
        );
        throw new Error("Kafka is not connected.");
      }

      const { key, value, eventType } = payload;

      if (!eventType) {
        this.logger?.warn(
          { eventSourceName, topic },
          "Sending event without an 'eventType'. This is not recommended."
        );
      }

      // Tạo một child logger với context của event này
      // const eventLogger = this.logger?.child({
      //   eventSourceName,
      //   topic,
      //   eventType,
      //   messageKey: key,
      // });
      const eventLogger = console;

      try {
        eventLogger?.info("Attempting to send event...");
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

        eventLogger?.info("✅ Event sent successfully.");
      } catch (error) {
        eventLogger?.error({ err: error }, "❌ Failed to send event.");
        throw error;
      }
    };
  }
}
