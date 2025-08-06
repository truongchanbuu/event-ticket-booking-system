export class ConsumerOrchestrator {
  /**
   * @param {object} dependencies - DI
   * @param {KafkaService} dependencies.kafkaService - Service hạ tầng Kafka.
   * @param {MessageDispatcher} dependencies.messageDispatcher - Service điều phối logic.
   * @param {object} dependencies.config - Config của ứng dụng.
   * @param {object} dependencies.logger
   */
  constructor({ container, kafkaService, messageDispatcher, config, logger }) {
    this.container = container;
    this.kafkaService = kafkaService;
    this.messageDispatcher = messageDispatcher;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Khởi động tất cả các consumer mà service này cần.
   * Hàm này sẽ được gọi một lần duy nhất trong quá trình bootstrap.
   */
  async startAll() {
    this.logger.info('Starting all Kafka consumers for this service...');

    const {
      topics,
      dlqTopics,
      consumerGroups,
      sessionTimeout,
      heartbeatInterval,
    } = this.config.kafka;

    const consumerDefinitions = [
      {
        topic: topics.application_events,
        groupId: consumerGroups.main_events,
        dlqTopic: dlqTopics.main_events_dlq,
        retryDelays: ['1m', '5m', '10m'],
        handler: async (payload) => {
          const { message } = payload;
          this.logger.info(
            `Processing message: ${message.offset} from topic ${payload.topic}`,
          );
          const scope = this.container.createScope();
          await this.messageDispatcher.dispatch(payload, scope);
        },
      },
      // Ví dụ: Nếu bạn có một consumer khác, chỉ cần thêm nó vào đây
      // {
      //     topic: topics.another_event,
      //     groupId: consumerGroups.another_group,
      //     dlqTopic: dlqTopics.another_dlq,
      //     retryDelays: ['30s', '2m'],
      //     handler: this.anotherHandler.handle.bind(this.anotherHandler)
      // }
    ];

    const allTopicsToEnsure = consumerDefinitions.flatMap((def) => [
      { topic: def.topic, numPartitions: 3 }, // Topic chính
      ...def.retryDelays.map((delay) => ({
        topic: `${def.topic}.retry.${delay}`,
      })),
      { topic: def.dlqTopic },
    ]);

    await this.kafkaService.ensureTopicsExist(allTopicsToEnsure);

    for (const def of consumerDefinitions) {
      await this.kafkaService.createConsumer({
        groupId: def.groupId,
        topic: def.topic,
        retryDelays: def.retryDelays,
        dlqTopic: def.dlqTopic,
        handler: def.handler,
        consumerConfig: {
          sessionTimeout,
          heartbeatInterval,
        },
      });
    }

    const allRetryConfigs = consumerDefinitions.map((def) => ({
      originalTopic: def.topic,
      retryDelays: def.retryDelays,
    }));

    await this.kafkaService.createGlobalRetryHandlerConsumer({
      groupId: consumerGroups.global_retry_group,
      retryConfigs: allRetryConfigs,
    });

    await this.kafkaService.createDlqConsumer({
      groupId: consumerGroups.dlq_group,
      dlqTopic: dlqTopics.main_events_dlq,
      consumerConfig: {
        sessionTimeout,
        heartbeatInterval,
      },
    });

    this.logger.info(
      '✅ All Kafka consumers and handlers have been started successfully.',
    );
  }
}
