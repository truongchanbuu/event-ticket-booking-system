import 'dotenv/config';
import { TOPICS } from '@event_ticket_booking_system/shared';

export default {
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    serviceName: process.env.SERVICE_NAME,
  },

  templates: {
    dir: 'src/templates',
  },

  redis: {
    prefix: process.env.REDIS_PREFIX || 'app',
    defaultTTL: process.env.REDIS_TTL || 300,
  },

  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID,
    brokers: process.env.KAFKA_BROKERS.split(','),
    connectionTimeout: Number.isNaN(
      Number(process.env.KAFKA_CONNECTION_TIMEOUT),
    )
      ? 3000
      : parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10),
    authenticationTimeout: Number.isNaN(Number(process.env.KAFKA_AUTH_TIMEOUT))
      ? 3000
      : parseInt(process.env.KAFKA_AUTH_TIMEOUT, 10),
    retry: {
      initialRetryTime: 100,
      retries: 5,
    },
    topics: {
      application_events: TOPICS.APPLICATION,
      attendee_events: TOPICS.EVENT,
    },
    sessionTimeout: 300000,
    heartbeatInterval: 10000,
    consumerGroups: {
      main_events: 'notification-service-main-group',
      global_retry_group: 'global-retry-handler-group',
      dlq_group: 'notification-service-dlq',
    },
    dlqTopics: {
      main_events_dlq: 'notification-service.main.dlq',
    },
  },

  sms: {
    twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
    twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
  },

  email: {
    from: process.env.FROM,
    resend: {
      apiKey: process.env.RESEND_API_KEY,
    },
    host: process.env.host,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
};
