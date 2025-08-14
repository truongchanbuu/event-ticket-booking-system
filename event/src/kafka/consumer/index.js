import { handleAvailabilityMessage } from "../handlers/availability.handler.js";

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
        this.logger = logger || console;
    }

    async startAll() {
        this.logger.info("Starting Kafka consumers...");

        const {
            topics,
            dlqTopics,
            consumerGroups,
            sessionTimeout,
            heartbeatInterval,
            replicationFactor = 1, // set 3 in prod
            defaultPartitions = 3, // fallback nếu không cấu hình
        } = this.config.kafka;

        // 1) Connect trước
        await this.kafkaService.initialize();

        // 2) Định nghĩa consumer
        const defs = [
            {
                topic: topics.ticket_type_events,
                groupId: consumerGroups.ticket_type_group,
                dlqTopic: dlqTopics.main_events_dlq,
                retryDelays: ["1m", "5m", "15m", "30m"],
                handler: async (payload) => {
                    const { topic, partition, message } = payload;
                    const start = Date.now();
                    const scope = this.container.createScope();
                    try {
                        this.logger.info(
                            `Processing '${topic}' p${partition} offset=${message.offset}`,
                        );
                        await this.messageDispatcher.dispatch(payload, scope);
                    } finally {
                        if (typeof scope.dispose === "function") {
                            await scope.dispose();
                        }
                        this.logger.info(
                            `Done '${topic}' offset=${message.offset} in ${Date.now() - start}ms`,
                        );
                    }
                },
            },
            {
                topic: topics.availability_events,
                groupId: consumerGroups.availability_group,
                dlqTopic: dlqTopics.main_events_dlq,
                retryDelays: ["30s", "2m", "10m", "30m"],
                numPartitions: defaultPartitions,
                handler: async (payload) => {
                    const scope = this.container.createScope();
                    try {
                        const deps = {
                            availabilityService: tryResolve(scope, [
                                "availabilityService",
                            ]),
                            availabilityEvents: tryResolve(scope, [
                                "availabilityEvents",
                            ]),
                            redis: tryResolve(scope, [
                                "redisService",
                                "redisClient",
                                "redis",
                            ]),
                            redisPubSub: tryResolve(scope, ["redisPubSub"]),
                            logger: this.logger,
                        };
                        await handleAvailabilityMessage(payload, deps);
                    } finally {
                        if (typeof scope.dispose === "function")
                            await scope.dispose();
                    }
                },
            },
        ];

        // 3) Validate cấu hình
        for (const d of defs) {
            if (!d.topic)
                throw new Error(`Missing topic in consumer definition`);
            if (!d.dlqTopic) throw new Error(`Missing dlqTopic for ${d.topic}`);
        }

        // 4) Ensure topics (gốc + retries + DLQ) với cùng số partition
        const perTopicPartitions = new Map(); // nếu bạn muốn tùy mỗi topic
        perTopicPartitions.set(topics.ticket_type_events, defaultPartitions);

        const toEnsure = defs.flatMap((d) => {
            const numPartitions =
                perTopicPartitions.get(d.topic) ?? defaultPartitions;
            const base = [{ topic: d.topic, numPartitions, replicationFactor }];
            const retries = d.retryDelays.map((delay) => ({
                topic: `${d.topic}.retry.${delay}`,
                numPartitions,
                replicationFactor,
                config: {
                    "retention.ms": (5 * 24 * 60 * 60 * 1000).toString(),
                }, // 5 ngày cho retry (ví dụ)
            }));
            const dlq = [
                {
                    topic: d.dlqTopic,
                    numPartitions,
                    replicationFactor,
                    config: {
                        "retention.ms": (30 * 24 * 60 * 60 * 1000).toString(),
                    }, // 30 ngày cho DLQ
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
        this.logger.info("✅ All Kafka topics ensured.");

        // 5) Start consumers (main)
        for (const d of defs) {
            await this.kafkaService.createConsumer({
                groupId: d.groupId,
                topic: d.topic,
                retryDelays: d.retryDelays,
                dlqTopic: d.dlqTopic,
                handler: d.handler,
                consumerConfig: {
                    sessionTimeout,
                    heartbeatInterval,
                    // maxBytes: 5 * 1024 * 1024, // 5MB
                },
                fromBeginning: false,
            });
        }

        // 6) Global retry handler (re-drive)
        await this.kafkaService.createGlobalRetryHandlerConsumer({
            groupId: consumerGroups.global_retry_group,
            retryConfigs: defs.map((d) => ({
                originalTopic: d.topic,
                retryDelays: d.retryDelays,
            })),
            // consumerConfig: { ... } // giữ mặc định của service
        });

        // 7) DLQ consumer
        await this.kafkaService.createDlqConsumer({
            groupId: consumerGroups.dlq_group,
            dlqTopic: dlqTopics.main_events_dlq,
            consumerConfig: { sessionTimeout, heartbeatInterval },
        });

        this.logger.info("✅ All Kafka consumers started.");
    }
}

function tryResolve(scope, names) {
    for (const n of names) {
        try {
            const v = scope.resolve(n);
            if (v) return v;
        } catch {}
    }
    return undefined;
}
