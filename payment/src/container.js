import { createContainer, asValue, asClass, asFunction } from 'awilix';

import config from './config/index.js';

import { ApiRoutes } from './routes/api.routes.js';

import {
  createLoggerFactory,
  createRedisClient,
  db,
  MessageDispatcher,
  RedisLockService,
  RedisService,
  TICKET_TYPE_CREATED,
  TICKET_TYPE_DELETED,
  TICKET_TYPE_UPDATED,
} from '@event_ticket_booking_system/shared';
import { PaymentService } from './services/payment.service.js';
import { PaymentController } from './controllers/payment.controller.js';
import { PaymentRoutes } from './routes/payment.routes.js';

export async function configureContainer() {
  // const logger = createLoggerFactory(config.app).logger;
  const logger = console;

  logger.info('Pre-initializing critical async services...');
  const kafkaServiceInstance = await createKafkaService({ config, logger });
  logger.info('✅ Kafka service instance created successfully.');

  const container = createContainer();

  const handlerMap = {};

  container.register({
    logger: asValue(logger),
    config: asValue(config),
    db: asValue(db),
    handlerMap: asValue(handlerMap),

    ticketTypeSnapshotRepo: asClass(TicketTypeSnapshotRepo).singleton(),

    kafkaService: asValue(kafkaServiceInstance),
    redisClient: asFunction(createRedisClient).singleton(),
    redisService: asClass(RedisService).singleton(),
    redisLockService: asClass(RedisLockService).singleton(),

    paymentService: asClass(PaymentService).singleton(),

    paymentController: asClass(PaymentController).scoped(),

    paymentRoutes: asClass(PaymentRoutes).singleton(),
    apiRoutes: asClass(ApiRoutes).singleton(),

    messageDispatcher: asClass(MessageDispatcher).singleton(),
  });

  logger.info('✅ All dependencies registered. Container is ready.');

  return container;
}
