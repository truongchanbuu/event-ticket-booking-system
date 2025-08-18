import { Kafka, CompressionTypes, logLevel } from "kafkajs";
import ms from "ms";
import { decodeEnvelope } from "./utils.js";
import { sleep } from "../helpers/utils.js";

const RETRIABLE_ERR_SNIPPETS = [
  "This server does not host this topic-partition",
  "NOT_LEADER_FOR_PARTITION",
  "NOT_LEADER_OR_FOLLOWER",
  "LEADER_NOT_AVAILABLE",
  "UNKNOWN_TOPIC_OR_PARTITION",
];

export class KafkaService {
  /** @private */ kafka;
  /** @private */ producer;
  /** @private */ admin;
  /** @private @type {Map<string, import('kafkajs').Consumer>} */ consumers =
    new Map();

  /** @private @type {'DISCONNECTED'|'CONNECTING'|'CONNECTED'} */ connectionState =
    "DISCONNECTED";
  /** @private @type {Promise<void>|null} */ connectionPromise = null;

  constructor({ config, logger = console }) {
    // Khuyến nghị: set logLevel qua config nếu cần
    this.kafka = new Kafka({ ...config /*, logLevel: logLevel.INFO */ });
    this.logger = logger;

    this.producer = this.kafka.producer({
      // Idempotent producer -> acks=-1 dưới hood; giữ maxInFlightRequests=1
      idempotent: true,
      maxInFlightRequests: 1,
      allowAutoTopicCreation: false,
      retry: {
        retries: 5,
        initialRetryTime: 300, // ms
        factor: 2,
      },
    });

    this.admin = this.kafka.admin();
  }

  // ---- lifecycle ----
  async initialize() {
    if (this.connectionState === "CONNECTED") return;
    if (this.connectionState === "CONNECTING") return this.connectionPromise;

    this.logger.info("KafkaService is connecting...");
    this.connectionState = "CONNECTING";

    this.connectionPromise = (async () => {
      try {
        await this.admin.connect();
        await this.producer.connect();
        this.connectionState = "CONNECTED";
        this.logger.info("✅ KafkaService connected.");
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

  health() {
    return {
      state: this.connectionState,
      producerConnected: this.connectionState === "CONNECTED",
    };
  }

  // ---- produce ----
  /**
   * @param {string} topic
   * @param {Array<{key?: string|Buffer, value: any, headers?: Record<string, any>, partition?: number}>} messages
   * @param {{compression?: number}} options
   */
  async send(topic, messages, options = {}) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected. Call initialize() first.");
    }

    const kafkaMessages = messages.map((m) => ({
      key: m.key,
      partition: typeof m.partition === "number" ? m.partition : undefined,
      value: Buffer.isBuffer(m.value)
        ? m.value
        : Buffer.from(
            typeof m.value === "string" ? m.value : JSON.stringify(m.value),
            "utf8"
          ),
      headers: m.headers,
    }));

    const compression = options.compression ?? CompressionTypes.GZIP;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.producer.send({
          topic,
          messages: kafkaMessages,
          compression,
          timeout: 30_000,
        });
      } catch (error) {
        const msg = String(error?.message || "");
        const isLeaderErr = RETRIABLE_ERR_SNIPPETS.some((s) => msg.includes(s));
        if (isLeaderErr && attempt < 3) {
          this.logger.warn(
            `[Kafka] metadata/leader error → refresh & retry (${attempt}/3)`,
            { topic, error: msg }
          );
          try {
            await this.admin.fetchTopicMetadata({ topics: [topic] });
          } catch (_) {}
          continue; // thử lại
        }
        this.logger.error(`❌ Failed to send messages to '${topic}'`, {
          error: msg,
        });
        throw error;
      }
    }
  }

  // ---- consumer (main with retry & DLQ publish) ----
  /**
   * @param {{
   *   groupId: string,
   *   topic: string,
   *   handler: (payload: import('kafkajs').EachMessagePayload) => Promise<void>,
   *   retryDelays: string[], // e.g. ['5s','30s','5m']
   *   dlqTopic: string,
   *   consumerConfig?: import('kafkajs').ConsumerConfig,
   *   fromBeginning?: boolean
   * }} cfg
   */
  async createConsumer({
    groupId,
    topic,
    handler,
    retryDelays = [],
    dlqTopic,
    consumerConfig = {},
    fromBeginning = false,
  }) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected. Call initialize() first.");
    }

    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 60_000,
      heartbeatInterval: 10_000,
      allowAutoTopicCreation: false,
      ...consumerConfig,
    });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning });

    await consumer.run({
      autoCommit: false,
      eachMessage: async (payload) => {
        const { topic: tp, partition, message, pause } = payload;
        try {
          const env = decodeEnvelope(message);
          payload.decoded = {
            ...env,
            headers: message.headers,
            key: message.key?.toString(),
            topic: tp,
            partition,
            offset: message.offset,
          };

          await handler(payload);

          // success -> commit
          await consumer.commitOffsets([
            {
              topic: tp,
              partition,
              offset: (Number(message.offset) + 1).toString(),
            },
          ]);
        } catch (error) {
          this.logger.error(`Handler failed; will route to retry/DLQ.`, {
            topic: tp,
            offset: message.offset,
            error: error.message,
          });

          // backpressure: tạm pause partition 1-2s để downstream thở
          pause();
          setTimeout(
            () => consumer.resume([{ topic: tp, partitions: [partition] }]),
            1500
          );

          // publish retry/DLQ; chỉ commit nếu publish thành công
          try {
            await this.publishToNextTopic(
              payload,
              error,
              topic,
              retryDelays,
              dlqTopic
            );
            await consumer.commitOffsets([
              {
                topic: tp,
                partition,
                offset: (Number(message.offset) + 1).toString(),
              },
            ]);
          } catch (pubErr) {
            this.logger.error(
              `❌ Failed to publish to retry/DLQ. Will NOT commit to avoid loss.`,
              {
                error: pubErr.message,
              }
            );
            // không commit -> message sẽ được re-deliver
          }
        }
      },
    });

    this.consumers.set(groupId, consumer);
    this.logger.info(`✅ Consumer created for '${topic}' (group '${groupId}')`);
  }

  /**
   * @private
   */
  async publishToNextTopic(
    payload,
    error,
    originalTopic,
    retryDelays,
    dlqTopic
  ) {
    const { topic, partition, message } = payload;
    const headers = message.headers || {};
    const attempt = headers["x-retry-attempt"]
      ? parseInt(headers["x-retry-attempt"].toString(), 10)
      : 0;

    const nextTopic =
      attempt < retryDelays.length
        ? `${originalTopic}.retry.${retryDelays[attempt]}`
        : dlqTopic;

    if (!nextTopic) {
      this.logger.error(`No retry/DLQ configured. Dropping message.`, {
        offset: message.offset,
      });
      return;
    }

    const safeValue = ensureSafeValue(message.value);
    let targetPartition = undefined;
    try {
      const md = await this.admin.fetchTopicMetadata({ topics: [nextTopic] });
      const t = md?.topics?.find((t) => t.name === nextTopic);
      const cnt = t?.partitions?.length || 0;
      if (typeof partition === "number" && partition >= 0 && partition < cnt) {
        targetPartition = partition;
      }
    } catch (_) {
      // Nếu không fetch được metadata, để undefined để Kafka tự băm theo key
    }

    await this.send(nextTopic, [
      {
        key: message.key,
        value: safeValue,
        headers: {
          ...headers,
          "x-original-topic": originalTopic,
          "x-retry-attempt": (attempt + 1).toString(),
          "x-failure-reason": error.message,
          "x-failure-ts": Date.now().toString(),
        },
        partition: targetPartition,
      },
    ]);
  }

  // ---- global retry handler (re-drive) ----
  /**
   * @param {{
   *   groupId: string,
   *   retryConfigs: Array<{originalTopic: string, retryDelays: string[]}>,
   *   consumerConfig?: import('kafkajs').ConsumerConfig
   * }} cfg
   */
  async createGlobalRetryHandlerConsumer({
    groupId,
    retryConfigs,
    consumerConfig = {},
  }) {
    if (this.connectionState !== "CONNECTED")
      throw new Error("Kafka not connected");

    const allRetryTopics = retryConfigs.flatMap((rc) =>
      rc.retryDelays.map((delay) => `${rc.originalTopic}.retry.${delay}`)
    );

    if (allRetryTopics.length === 0) {
      this.logger.warn(
        "No retry topics configured for the global retry handler."
      );
      return;
    }

    const sleep = (duration) => new Promise((r) => setTimeout(r, duration));

    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 15_000,
      heartbeatInterval: 5_000,
      allowAutoTopicCreation: false,
      ...consumerConfig,
    });

    await consumer.connect();
    await consumer.subscribe({ topics: allRetryTopics, fromBeginning: false });

    this.logger.info(
      `✅ Global Retry Handler listening ${
        allRetryTopics.length
      } topics: [${allRetryTopics.join(", ")}]`
    );

    await consumer.run({
      autoCommit: false,
      eachBatchAutoResolve: false,
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        isRunning,
        isStale,
        commitOffsetsIfNecessary,
      }) => {
        const topic = batch.topic;
        const partition = batch.partition;
        const delayString = topic.split(".").pop() || "0s";
        const delayMs = ms(delayString);

        for (const message of batch.messages) {
          this.logger.info(`[RETRY] Waiting ${delayString} before re-drive`, {
            topic,
            partition,
            offset: message.offset,
          });

          const ok = await waitWithHeartbeat(
            delayMs,
            { heartbeat, isRunning, isStale },
            5000,
            this.logger
          );
          if (!ok) return;

          try {
            const originalTarget =
              message.headers?.["x-original-topic"]?.toString();
            if (!originalTarget)
              throw new Error("Missing 'x-original-topic' header");

            await this.send(originalTarget, [
              {
                key: message.key,
                value: message.value,
                headers: message.headers, // giữ nguyên headers (x-retry-attempt,...)
              },
            ]);

            resolveOffset(message.offset);
            await commitOffsetsIfNecessary(); // commit đúng generation
          } catch (error) {
            this.logger.error(
              `[RETRY] Re-drive failed; message will be retried.`,
              {
                topic,
                partition,
                offset: message.offset,
                error: error.message,
              }
            );
            // KHÔNG resolveOffset -> sẽ reprocess
          }

          // thân thiện với group khi batch lớn
          await heartbeat();
        }
      },
    });

    this.consumers.set(groupId, consumer);
  }

  // ---- DLQ consumer ----
  async createDlqConsumer({
    groupId,
    dlqTopic,
    dlqHandler,
    consumerConfig = {},
  }) {
    if (this.connectionState !== "CONNECTED")
      throw new Error("Kafka is unavailable. initialize() first.");

    this.logger.info(
      `Creating DLQ consumer for '${dlqTopic}' (group '${groupId}')...`
    );

    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 60_000,
      heartbeatInterval: 10_000,
      allowAutoTopicCreation: false,
      ...consumerConfig,
    });

    await consumer.connect();
    await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

    const finalDlqHandler =
      dlqHandler ||
      (async ({ topic, partition, message }) => {
        const failureReason =
          message.headers?.["x-failure-reason"]?.toString() || "No reason";
        const originalTopic =
          message.headers?.["x-original-topic"]?.toString() || "Unknown";
        this.logger.error(`🚨 DLQ message`, {
          dlqTopic: topic,
          partition,
          offset: message.offset,
          originalTopic,
          failureReason,
          messageKey: message.key?.toString(),
        });
      });

    await consumer.run({
      autoCommit: true,
      eachMessage: async (payload) => {
        try {
          await finalDlqHandler(payload);
        } catch (error) {
          this.logger.error(`❌ DLQ handler failed`, {
            topic: payload.topic,
            offset: payload.message.offset,
            error: error.message,
          });
        }
      },
    });

    this.consumers.set(groupId, consumer);
    this.logger.info(`✅ DLQ consumer is listening on '${dlqTopic}'.`);
  }

  // ---- admin ----
  /**
   * @param {Array<{topic: string, numPartitions?: number, replicationFactor?: number, config?: Record<string,string>}>} topicsToEnsure
   */
  async ensureTopicsExist(topicsToEnsure) {
    if (this.connectionState !== "CONNECTED") {
      throw new Error("Kafka not connected. Call initialize() first.");
    }
    if (!topicsToEnsure?.length) return;

    this.logger.info("Ensuring topics...", {
      topics: topicsToEnsure.map((t) => t.topic),
    });

    try {
      await this.admin.createTopics({
        validateOnly: false,
        waitForLeaders: true,
        topics: topicsToEnsure.map((t) => ({
          topic: t.topic,
          numPartitions: t.numPartitions ?? 1,
          replicationFactor: t.replicationFactor ?? 1, // set 3 in prod
          configEntries: Object.entries({
            "retention.ms": "604800000", // 7 days default
            // "cleanup.policy": "delete",
            ...(t.config ?? {}),
          }).map(([name, value]) => ({ name, value })),
        })),
      });
      this.logger.info("✅ Topics ready (or already existed).");
    } catch (error) {
      if (error.name === "TopicAlreadyExistsError") {
        this.logger.warn("Topics already exist.");
        return;
      }
      this.logger.error("❌ Failed to create topics.", {
        error: error.message,
      });
      throw error;
    }
  }

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
      this.logger.info("✅ Admin disconnected.");

      this.connectionState = "DISCONNECTED";
      this.connectionPromise = null;
      this.logger.info("✅ KafkaService disconnected.");
    } catch (error) {
      this.logger.error("❌ Error during Kafka disconnection.", {
        error: error.message,
      });
      throw error;
    }
  }

  async listTopics() {
    if (this.connectionState !== "CONNECTED")
      throw new Error("Kafka not connected");
    return this.admin.listTopics();
  }

  // ---- helper: sender factory ----
  createTopicSender(topic, eventSourceName) {
    const hash32 = (s) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
      return Math.abs(h | 0);
    };

    return async ({ key, value, eventType, partition, headers = {} }) => {
      if (this.connectionState !== "CONNECTED") {
        this.logger.error(
          { eventSourceName, topic },
          "Cannot send; Kafka is not connected."
        );
        throw new Error("Kafka is not connected.");
      }

      if (!eventType) {
        this.logger.warn(
          { eventSourceName, topic },
          "Sending event without 'eventType'."
        );
      }

      // normalize key
      const normKey = ensureSafeValue(key);

      const normValue = ensureSafeValue(value);

      const baseHeaders = {
        "event-type": eventType || "unknown",
        "event-version": headers["event-version"] || "1",
        "source-service":
          process.env.KAFKA_PRODUCER_SERVICE_NAME ||
          eventSourceName ||
          "unknown-service",
        "content-type": headers["content-type"] || "application/json",
        "x-sent-at": Date.now().toString(),
      };
      const mergedHeaders = { ...baseHeaders, ...headers };

      let targetPartition = partition;
      if (
        targetPartition == null &&
        typeof normKey === "string" &&
        this.topicPartitions?.[topic] > 0
      ) {
        const n = this.topicPartitions[topic]; // số partition nếu bạn có cache metadata
        targetPartition = n ? hash32(normKey) % n : undefined;
      }

      try {
        await this.send(topic, [
          {
            key: normKey,
            value: normValue,
            headers: mergedHeaders,
            partition: targetPartition,
          },
        ]);
      } catch (err) {
        this.logger.error(
          { eventSourceName, topic, eventType, err: err?.message },
          "Kafka send failed"
        );
        throw err;
      }
    };
  }
}

const ensureSafeValue = (value) => {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value !== "string") return String(value);
  return value;
};

async function waitWithHeartbeat(
  totalMs,
  tools,
  tickMs = 5000,
  logger = console
) {
  let left = totalMs;
  while (left > 0) {
    const step = Math.min(tickMs, left);
    await sleep(step);
    if (!tools.isRunning() || tools.isStale()) return false;
    try {
      await tools.heartbeat();
    } catch (e) {
      logger.warn("[RETRY] heartbeat failed", { error: e.message });
    }
    left -= step;
  }
  return true;
}
