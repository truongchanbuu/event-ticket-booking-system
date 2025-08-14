export class ConsumerOrchestrator {
    constructor({
        container,
        kafkaService,
        messageDispatcher,
        config,
        logger = console,
    }) {
        this.container = container;
        this.kafkaService = kafkaService;
        this.messageDispatcher = messageDispatcher;
        this.config = config;
        this.logger = logger;
    }

    async startAll({ fromBeginning = false } = {}) {
        this.logger.info("Starting Kafka consumers (booking/payment)…");

        const {
            topics,
            dlqTopics,
            consumerGroups,
            sessionTimeout,
            heartbeatInterval,
            defaults: {
                replicationFactor,
                partitions: defaultPartitions,
                retryRetentionMs,
                dlqRetentionMs,
            },
        } = this.config.kafka;

        await this.kafkaService.initialize();

        // 1) chỉ còn 1 định nghĩa consumer cho payment
        const defs = [
            {
                topic: topics.payment_events,
                groupId: consumerGroups.payment_group,
                dlqTopic: dlqTopics.main_events_dlq,
                retryDelays: ["30s", "2m", "10m", "30m"],
                numPartitions: defaultPartitions,
            },
            {
                topic: topics.availability_events,
                groupId: consumerGroups.availability_group, 
                retryDelays: ["30s", "2m", "10m", "30m"],
                numPartitions: defaultPartitions,
            }
        ];

        const toEnsure = defs.flatMap((d) => {
            const base = [
                {
                    topic: d.topic,
                    numPartitions: d.numPartitions,
                    replicationFactor,
                },
            ];
            const retries = d.retryDelays.map((delay) => ({
                topic: `${d.topic}.retry.${delay}`,
                numPartitions: d.numPartitions,
                replicationFactor,
                config: { "retention.ms": String(retryRetentionMs) },
            }));

            const dlq = [
                {
                    topic: d.dlqTopic,
                    numPartitions: d.numPartitions,
                    replicationFactor,
                    config: { "retention.ms": String(dlqRetentionMs) },
                },
            ];
            return [...base, ...retries, ...dlq];
        });

        const seen = new Set();
        const uniqEnsure = toEnsure.filter((t) => {
            const k = `${t.topic}:${t.numPartitions}:${t.replicationFactor}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });

        await this.kafkaService.ensureTopicsExist(uniqEnsure);
        this.logger.info("✅ Kafka topics ensured.");

        // 3) start consumer
        for (const d of defs) {
            await this.kafkaService.createConsumer({
                groupId: d.groupId,
                topic: d.topic,
                retryDelays: d.retryDelays,
                dlqTopic: d.dlqTopic,
                consumerConfig: { sessionTimeout, heartbeatInterval },
                fromBeginning,
                handler: async (payload) => {
                    const scope = this.container.createScope
                        ? this.container.createScope()
                        : {
                              resolve: (t) => this.container.resolve(t),
                              dispose: async () => {},
                          };

                    try {
                        await this.messageDispatcher.dispatch(payload, scope);
                    } finally {
                        if (typeof scope.dispose === "function")
                            await scope.dispose();
                    }
                },
            });
        }

        // 4) global retry handler + DLQ
        await this.kafkaService.createGlobalRetryHandlerConsumer({
            groupId: consumerGroups.global_retry_group,
            retryConfigs: defs.map((d) => ({
                originalTopic: d.topic,
                retryDelays: d.retryDelays,
            })),
        });

        await this.kafkaService.createDlqConsumer({
            groupId: consumerGroups.dlq_group,
            dlqTopic: dlqTopics.main_events_dlq,
            consumerConfig: { sessionTimeout, heartbeatInterval },
        });

        this.logger.info("✅ All Kafka consumers started.");
    }
}

export * from "./handleMap.js";
