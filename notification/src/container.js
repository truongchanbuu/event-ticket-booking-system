import { createContainer, asValue, asClass, asFunction } from 'awilix';

import config from './config/index.js';
import {
  APPLICATION_APPROVED,
  APPLICATION_PERMANENTLY_REJECTED,
  APPLICATION_REJECTED,
  createLoggerFactory,
  createRedisClient,
  db,
  RedisService,
} from '@event_ticket_booking_system/shared';
import { createKafkaService } from './services/kafka.service.js';
import { loadNotificationConfig } from './utils/config.loader.js';
import { EmailService } from './services/email.service.js';
import createSmsService from './services/sms.service.js';
import { createInAppService } from './services/in-app.service.js';
import { NotificationService } from './services/notification.service.js';
import { MessageDispatcher } from './kafka/consumers/message-dispatcher.js';
import { ApplicationNotificationHandler } from './kafka/consumers/application-status-change.handler.js';

/**
 * Hàm factory để tạo, đăng ký, và khởi động DI container.
 */
export async function configureContainer() {
  const logger = console;
  // const logger = createLoggerFactory(config.app).logger;

  const handlerMap = {
    [APPLICATION_APPROVED]: 'applicationApprovedHandler',
    [APPLICATION_REJECTED]: 'applicationRejectedHandler',
    [APPLICATION_PERMANENTLY_REJECTED]: 'applicationPermanentlyRejectedHandler',
  };

  logger.info('Pre-initializing critical async services...');
  const kafkaServiceInstance = await createKafkaService({ config, logger });
  logger.info('✅ Kafka service instance created successfully.');

  const templateConfig = loadNotificationConfig(
    './src/config/notification.config.yaml',
  );

  const container = createContainer();
  container.register({
    logger: asValue(logger),
    config: asValue(config),
    templateConfig: asValue(templateConfig),
    handlerMap: asValue(handlerMap),

    kafkaService: asValue(kafkaServiceInstance),
    redisClient: asFunction(createRedisClient).singleton(),

    // Services (thường là singleton)
    db: asValue(db),
    redisService: asClass(RedisService).singleton(),
    emailService: asClass(EmailService).singleton(),
    smsService: asFunction(createSmsService).singleton(),
    inAppService: asFunction(createInAppService).singleton(),
    notificationService: asClass(NotificationService).singleton(),

    messageDispatcher: asClass(MessageDispatcher).singleton(),

    applicationApprovedHandler: asFunction(
      ({ notificationService, logger }) => {
        return new ApplicationNotificationHandler({
          notificationService: notificationService,
          logger: logger,
          eventType: APPLICATION_APPROVED,
        });
      },
    ).scoped(),

    applicationRejectedHandler: asFunction(
      ({ notificationService, logger }) => {
        return new ApplicationNotificationHandler({
          notificationService: notificationService,
          logger: logger,
          eventType: APPLICATION_REJECTED,
        });
      },
    ).scoped(),

    applicationPermanentlyRejectedHandler: asFunction(
      ({ notificationService, logger }) => {
        return new ApplicationNotificationHandler({
          notificationService: notificationService,
          logger: logger,
          eventType: APPLICATION_PERMANENTLY_REJECTED,
        });
      },
    ).scoped(),
  });

  logger.info('✅ All dependencies registered. Container is ready.');

  return container;
}
