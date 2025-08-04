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
      value: Buffer.isBuffer(msg.value)
        ? msg.value
        : Buffer.from(
            typeof msg.value === "string"
              ? msg.value
              : JSON.stringify(msg.value),
            "utf8"
          ),
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

    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 60000, // 60 giây
      heartbeatInterval: 10000, // 10 giây
      ...consumerConfig,
    });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    await consumer.run({
      autoCommit: false,
      eachMessage: async (payload) => {
        const { partition, message } = payload;
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
        } finally {
          await consumer.commitOffsets([
            {
              topic,
              partition,
              offset: (Number(message.offset) + 1).toString(),
            },
          ]);
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

    const safeValue = ensureSafeValue(message.value);
    await this.send(nextTopic, [
      {
        key: message.key,
        value: safeValue,
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
   * Tự động tính toán sessionTimeout dựa trên độ trễ retry dài nhất.
   * @param {object} config
   * @param {string} config.groupId - Group ID cho consumer retry.
   * @param {Array<{originalTopic: string, retryDelays: string[]}>} config.retryConfigs - Mảng cấu hình các topic retry.
   * @param {import('kafkajs').ConsumerConfig} [config.consumerConfig] - Cấu hình KafkaJS bổ sung để ghi đè các giá trị mặc định.
   */
  async createGlobalRetryHandlerConsumer({
    groupId,
    retryConfigs,
    consumerConfig = {}, // Thêm tham số này!
  }) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected");
    }

    const allRetryTopics = retryConfigs.flatMap((rc) =>
      rc.retryDelays.map((delay) => `${rc.originalTopic}.retry.${delay}`)
    );

    if (allRetryTopics.length === 0) {
      this.logger?.warn(
        "No retry topics configured for the global retry handler."
      );
      return;
    }

    // Tự động tính toán độ trễ dài nhất từ tất cả các cấu hình
    const longestDelayMs = retryConfigs
      .flatMap((rc) => rc.retryDelays.map((delay) => ms(delay)))
      .reduce((max, current) => Math.max(max, current), 0);

    this.logger?.info(
      `Global retry handler configured with longest delay: ${longestDelayMs}ms.`
    );

    const sleep = (duration) =>
      new Promise((resolve) => setTimeout(resolve, duration));

    const consumer = this.kafka.consumer({
      groupId,
      // Đặt sessionTimeout lớn hơn một chút so với độ trễ dài nhất
      sessionTimeout: longestDelayMs + 15000, // Thêm 15 giây dự phòng
      // Heartbeat nên bằng khoảng 1/3 sessionTimeout
      heartbeatInterval: Math.floor((longestDelayMs + 15000) / 3),
      // Cho phép người dùng ghi đè các giá trị trên hoặc thêm cấu hình khác
      ...consumerConfig,
    });

    await consumer.connect();
    await consumer.subscribe({ topics: allRetryTopics, fromBeginning: true });

    this.logger?.info(
      `✅ Global Retry Handler consumer listening to ${
        allRetryTopics.length
      } topics: [${allRetryTopics.join(", ")}]`
    );

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        // ... logic xử lý `eachMessage` của bạn giữ nguyên ...
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

        const safeValue = ensureSafeValue(message.value);
        await this.send(originalTargetTopic, [
          {
            key: message.key,
            value: safeValue,
            headers: message.headers,
          },
        ]);
      },
    });

    this.consumers.set(groupId, consumer);
  }

  /**
   * Tạo một consumer cho Dead Letter Queue (DLQ).
   * Consumer này sẽ lắng nghe trên một topic DLQ cụ thể và xử lý các tin nhắn cuối cùng đã thất bại.
   *
   * @param {object} config
   * @param {string} config.groupId - Group ID cho DLQ consumer.
   * @param {string} config.dlqTopic - Tên của topic DLQ cần lắng nghe.
   * @param {function(object): Promise<void>} [config.dlqHandler] - Một hàm tùy chọn để xử lý tin nhắn DLQ. Nếu không được cung cấp, nó sẽ mặc định ghi log tin nhắn.
   * @param {import('kafkajs').ConsumerConfig} [config.consumerConfig] - Cấu hình bổ sung cho consumer của KafkaJS.
   * @returns {Promise<void>}
   */
  async createDlqConsumer({
    groupId,
    dlqTopic,
    dlqHandler,
    consumerConfig = {},
  }) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error(
        "Kafka chưa được kết nối. Vui lòng gọi initialize() trước."
      );
    }

    this.logger?.info(
      `Đang tạo DLQ consumer cho topic '${dlqTopic}' với group '${groupId}'...`
    );

    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 60000, // 60 giây
      heartbeatInterval: 10000, // 10 giây
      ...consumerConfig,
    });

    await consumer.connect();
    await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

    const finalDlqHandler =
      dlqHandler ||
      (async (payload) => {
        const { topic, partition, message } = payload;
        const failureReason =
          message.headers["x-failure-reason"]?.toString() || "No reason.";
        const originalTopic =
          message.headers["x-original-topic"]?.toString() ||
          "Cannot find root topic.";

        this.logger?.error(`🚨 Messages cannot processed sent to DLQ`, {
          dlqTopic: topic,
          dlqPartition: partition,
          dlqOffset: message.offset,
          originalTopic: originalTopic,
          failureReason: failureReason,
          messageKey: message.key?.toString(),
          // messageValue: message.value?.toString(),
        });

        // TODO: Impl whatever you want to monitor
      });

    await consumer.run({
      autoCommit: true,
      eachMessage: async (payload) => {
        try {
          await finalDlqHandler(payload);
        } catch (error) {
          this.logger?.error(
            `❌ Serious! DLQ handler failed to process message.`,
            {
              dlqTopic: payload.topic,
              offset: payload.message.offset,
              error: error.message,
            }
          );
        }
      },
    });

    this.consumers.set(groupId, consumer);
    this.logger?.info(
      `✅ DLQ consumer is ready and listend on '${dlqTopic}' topic.`
    );
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
          replicationFactor: t.replicationFactor || 1, // 3 for production
          configEntries: [
            {
              name: "retention.ms",
              value: "604800000", // 7 days default
            },
          ],
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

      try {
        this.logger?.info("Attempting to send event...");
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

        this.logger?.info("✅ Event sent successfully.");
      } catch (error) {
        this.logger?.error({ err: error }, "❌ Failed to send event.");
        throw error;
      }
    };
  }
}

const ensureSafeValue = (value) => {
  let safeValue = value;

  if (Buffer.isBuffer(safeValue)) {
  } else if (typeof safeValue === "object") {
    safeValue = JSON.stringify(safeValue);
  } else if (typeof safeValue !== "string") {
    safeValue = String(safeValue);
  }

  return safeValue;
};
