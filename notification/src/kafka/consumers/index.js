// src/consumers/index.js (Hoặc consumer_orchestrator.js)

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

    const { topics, dlqTopics, consumerGroups } = this.config.kafka;

    await this.kafkaService.createConsumer(
      consumerGroups.main_events,
      topics.application_events,
      async (rawMessage) => {
        console.log(`data out: ${JSON.stringify(rawMessage)}`);
        const scope = this.container.createScope();
        await this.messageDispatcher.dispatch(rawMessage, scope);
      },
      dlqTopics.main_events_dlq,
    );

    // Ví dụ: Tạo một consumer khác cho một mục đích khác, có thể với một handler khác
    // await this.kafkaService.createConsumer(
    //   consumerGroups.another_group,
    //   topics.another_topic,
    //   this.anotherHandler.handle.bind(this.anotherHandler)
    // );

    this.logger.info('✅ All Kafka consumers have been started.');
  }
}
