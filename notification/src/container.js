import config from './config/index.js';
import { createContainer, asValue, asFunction } from 'awilix';
import { loadNotificationConfig } from './utils/config.loader';
import createSmsService from './services/sms.service';
import { createEmailService } from './services/email.service.js';
import { createInAppService } from './services/in-app.service.js';
import { db } from '@event_ticket_booking_system/shared';
import kafkaService from './kafka/kafka.service.js';

const templateConfig = loadNotificationConfig();

const container = createContainer();

container.register({
  logger: asValue(rootLogger),
  runtimeConfig: asValue(config),
  templateConfig: asValue(templateConfig),

  db: asValue(db),
  kafkaService: asValue(kafkaService).singleton(),
  emailService: asFunction(createEmailService).singleton(),
  smsService: asFunction(createSmsService).singleton(),
  inAppService: asFunction(createInAppService).singleton(),

  // NotificationService có DI các service bên trên
  notificationService: asClass(NotificationService).singleton(),
});

export default container;
