import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { configureContainer } from "./container.js";
import { ConsumerOrchestrator } from "./kafka/consumer/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;

async function bootstrap() {
    try {
        const container = await configureContainer();

        const broadcaster = container.resolve("broadcaster");
        await broadcaster.start();

        const inventoryService = container.resolve("inventoryService");
        const reservePath = path.join(__dirname, "./scripts/lua/reserve.lua");
        const releasePath = path.join(__dirname, "./scripts/lua/release.lua");

        const reserveLua = await fs.readFile(reservePath, "utf8");
        const releaseLua = await fs.readFile(releasePath, "utf8");

        console.debug(
            "[Lua] reserve bytes:",
            reserveLua?.length,
            "release bytes:",
            releaseLua?.length,
        );

        await inventoryService.initialize({ reserveLua, releaseLua });

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
        const app = createApp({ container, config, logger: rootLogger });
        const PORT = config.app.port;

        server = app.listen(PORT, () => {
            rootLogger.debug(`🚀 Event service running on port ${PORT}`);
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
                const shutdown = container.resolve("shutdown");
                await shutdown();
                rootLogger.debug("✅ Closing connections gracefully.");
            } catch (error) {
                rootLogger.error("❌ Error closing connections:", error);
            }

            rootLogger.debug("👋 Shutdown complete. Exiting now.");
            process.exit(0);
        };

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    } catch (error) {
        console.error("❌ Failed to start the Event service:", error);
        process.exit(1);
    }
}

bootstrap();
