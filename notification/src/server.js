import { createApp } from './app.js';
import { configureContainer } from './container.js';
import { ConsumerOrchestrator } from './kafka/consumers/index.js';

let server;

async function bootstrap() {
  try {
    const container = await configureContainer();

    const config = container.resolve('config');
    const rootLogger = container.resolve('logger');

    // Initialize Kafka
    const kafkaService = container.resolve('kafkaService');

    const consumerOrchestrator = new ConsumerOrchestrator({
      container: container,
      kafkaService: kafkaService,
      messageDispatcher: container.resolve('messageDispatcher'),
      config: config,
      logger: rootLogger,
    });
    await consumerOrchestrator.startAll();

    // Create and start the app
    const app = createApp({ container, config, rootLogger });
    const PORT = config.app.port;

    server = app.listen(PORT, () => {
      rootLogger.debug(`🚀 Notification service running on port ${PORT}`);
      rootLogger.debug(`📊 Environment: ${config.app.nodeEnv}`);
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
        rootLogger.error('❌ Error closing Kafka connections:', error);
      }

      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start the Notification service:', error);
    process.exit(1);
  }
}

bootstrap();
