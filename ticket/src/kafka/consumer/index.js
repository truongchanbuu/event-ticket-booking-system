export class ConsumerOrchestrator {
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

    async startAll() {
        this.logger.info("Starting all Kafka consumers for this service...");

        const {
            topics,
            dlqTopics,
            consumerGroups,
            sessionTimeout,
            heartbeatInterval,
        } = this.config.kafka;

        const consumerDefinitions = [
            {
                topic: topics.event_lifecycle,
                groupId: consumerGroups.event_ticket_type_group,
                dlqTopic: dlqTopics.main_tickets_dlq,
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
            { topic: def.topic, numPartitions: 3 },
            ...def.retryDelays.map((delay) => ({
                topic: `${def.topic}.retry.${delay}`,
            })),
            { topic: def.dlqTopic, numPartitions: 3 },
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
            dlqTopic: dlqTopics.main_tickets_dlq,
            consumerConfig: {
                sessionTimeout,
                heartbeatInterval,
            },
        });

        this.logger.info(
            "✅ All Kafka consumers and handlers have been started successfully.",
        );
    }
}
