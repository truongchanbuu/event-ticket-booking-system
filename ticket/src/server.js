import { createApp } from "./app.js";
import { configureContainer } from "./container.js";
import { ConsumerOrchestrator } from "./kafka/consumer/index.js";

let server;

async function bootstrap() {
    try {
        const container = await configureContainer();

        const config = container.resolve("config");
        const rootLogger = container.resolve("logger");

        // Initialize Kafka
        const kafkaService = container.resolve("kafkaService");
        const consumerOrchestrator = new ConsumerOrchestrator({
            container: container,
            kafkaService: kafkaService,
            messageDispatcher: container.resolve("messageDispatcher"),
            config: config,
            logger: rootLogger,
        });
        await consumerOrchestrator.startAll();

        // Create and start the app
        const app = createApp({ container, config, rootLogger });
        const PORT = config.app.port;

        server = app.listen(PORT, () => {
            rootLogger.debug(`🚀 Ticket service running on port ${PORT}`);
            rootLogger.debug(`📊 Environment: ${config.app.nodeEnv}`);
        });

        const gracefulShutdown = async (signal) => {
            rootLogger.debug(
                `\n🛑 Received ${signal}. Starting graceful shutdown. Draining connections...`,
            );

            if (server) {
                await new Promise((resolve, reject) => {
                    server.close((err) => {
                        if (err) {
                            rootLogger.error(
                                "❌ Error closing HTTP server:",
                                err,
                            );
                            return reject(err);
                        }
                        rootLogger.debug(
                            "✅ HTTP server closed. No new requests will be accepted.",
                        );
                        resolve();
                    });
                });
            }

            try {
                await kafkaService.disconnect();
                rootLogger.debug("✅ Kafka connections closed gracefully.");
            } catch (error) {
                rootLogger.error("❌ Error closing Kafka connections:", error);
            }

            rootLogger.debug("👋 Shutdown complete. Exiting now.");
            process.exit(0);
        };

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    } catch (error) {
        console.error("❌ Failed to start the Ticket service:", error);
        process.exit(1);
    }
}

bootstrap();
