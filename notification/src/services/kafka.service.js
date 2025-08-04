import { KafkaService } from '@event_ticket_booking_system/shared';

export const createKafkaService = async ({ config, logger }) => {
  const kafkaConfig = config.kafka;
  const service = new KafkaService({ config: kafkaConfig });

  logger.info('[Kafka] Initializing connection...');
  await service.initialize();
  await service.listTopics();
  logger.info('[Kafka] Connection initialized successfully.');

  return service;
};
