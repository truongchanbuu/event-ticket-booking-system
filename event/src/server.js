import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { configureContainer } from "./container.js";
import { ConsumerOrchestrator } from "./kafka/consumer/index.js";
import { wireGracefulShutdown } from "@event_ticket_booking_system/shared/grateful.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;

async function bootstrap() {
    try {
        const container = await configureContainer();

        const broadcaster = container.resolve("broadcaster");
        await broadcaster.start();

        const inventoryService = container.resolve("inventoryService");
        const seedPath = path.join(__dirname, "./inventory/lua/seed.lua");
        const reservePath = path.join(__dirname, "./inventory/lua/reserve.lua");
        const releasePath = path.join(__dirname, "./inventory/lua/release.lua");

        const seedLua = await fs.readFile(seedPath, "utf8");
        const reserveLua = await fs.readFile(reservePath, "utf8");
        const releaseLua = await fs.readFile(releasePath, "utf8");

        console.debug(
            "[Lua] reserve bytes:",
            reserveLua?.length,
            "release bytes:",
            releaseLua?.length,
        );

        await inventoryService.initialize({ seedLua, reserveLua, releaseLua });

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

        wireGracefulShutdown({
            server,
            container,
            logger: rootLogger,
            timeoutMs: 5_000,
            ignoreSignals: ["SIGHUP", "SIGUSR2"],
            handleSignals: ["SIGINT", "SIGTERM"],
            onBeforeClose: async () => {
                readinessFlag = false;
                await new Promise((r) => setTimeout(r, 5000));
                await sleep(3000);
            },
        });
    } catch (error) {
        console.error("❌ Failed to start the Event service:", error);
        process.exit(1);
    }
}

bootstrap();
