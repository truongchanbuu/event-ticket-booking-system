import createApp from './app.js';
import { ENV } from './config/env.js';
import { loadNotificationConfig } from './utils/config.loader.js';

let server;

async function bootstrap() {
  try {
    // Initialize Kafka
    await kafkaService.initialize();
    await kafkaService.listTopics();

    // Create and start the app
    const app = await createApp();
    const PORT = ENV.PORT || 3000;

    server = app.listen(PORT, () => {
      rootLogger.debug(`🚀 Notification service running on port ${PORT}`);
      rootLogger.debug(`📊 Environment: ${ENV.NODE_ENV}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      rootLogger.debug(
        `\n🛑 Received ${signal}. Starting graceful shutdown...`,
      );

      if (server) {
        server.close(() => {
          rootLogger.debug('✅ HTTP server closed');
        });
      }

      try {
        await kafkaService.disconnect();
        rootLogger.debug('✅ Kafka connections closed');
      } catch (error) {
        console.error('❌ Error closing Kafka connections:', error);
      }

      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start the notification service:', error);
    process.exit(1);
  }
}

bootstrap().catch((e) => {
  console.error('❌ Failed to start the notification service', e);
  process.exit(1);
});
