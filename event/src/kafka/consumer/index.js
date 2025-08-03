export class ConsumerOrchestrator {
    /**
     * @param {object} dependencies - DI
     * @param {import('awilix').AwilixContainer} dependencies.container - DI container.
     * @param {import('./kafka.service').KafkaService} dependencies.kafkaService - Service hạ tầng Kafka.
     * @param {MessageDispatcher} dependencies.messageDispatcher - Service điều phối logic.
     * @param {object} dependencies.config - Config của ứng dụng.
     * @param {object} dependencies.logger
     */
    constructor({
        container,
        kafkaService,
        messageDispatcher,
        config,
        logger,
    }) {
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
        this.logger.info("Starting all Kafka consumers for this service...");

        const { topics, dlqTopics, consumerGroups } = this.config.kafka;

        const consumerDefinitions = [
            {
                topic: topics.ticket_type_events,
                groupId: consumerGroups.ticket_type_group,
                dlqTopic: dlqTopics.ticket_type_dlq,
                retryDelays: ["1m", "5m", "15m", "30m"],
                handler: async (payload) => {
                    this.logger.info(
                        `Processing ticket type event: message ${payload.message.offset} from topic ${payload.topic}`,
                    );
                    const scope = this.container.createScope();
                    await this.messageDispatcher.dispatch(payload, scope);
                },
            },
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
            });
        }

        const allRetryConfigs = consumerDefinitions.map((def) => ({
            originalTopic: def.topic,
            retryDelays: def.retryDelays,
        }));

        await this.kafkaService.createGlobalRetryHandlerConsumer({
            groupId: "event-service-global-retry-handler",
            retryConfigs: allRetryConfigs,
        });

        this.logger.info(
            "✅ All Kafka consumers and handlers have been started successfully.",
        );
    }
}
