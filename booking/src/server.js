import { wireGracefulShutdown } from "@event_ticket_booking_system/shared/grateful.js";
import { createApp } from "./app.js";
import { configureContainer } from "./container.js";
// import { ConsumerOrchestrator } from "./kafka/consumer/index.js";

let server;

async function bootstrap() {
    try {
        const container = await configureContainer();

        const config = container.resolve("config");
        const rootLogger = container.resolve("logger");

        // Initialize Kafka
        // const kafkaService = container.resolve("kafkaService");
        // const consumerOrchestrator = new ConsumerOrchestrator({
        //     container: container,
        //     kafkaService: kafkaService,
        //     messageDispatcher: container.resolve("messageDispatcher"),
        //     config: config,
        //     logger: rootLogger,
        // });
        // await consumerOrchestrator.startAll();

        const { reservationReaper } = container.cradle;
        await reservationReaper.start();

        // Create and start the app
        const app = createApp({ container, config, logger: rootLogger });
        const PORT = config.app.port;

        server = app.listen(PORT, () => {
            rootLogger.debug(`🚀 Booking service running on port ${PORT}`);
            rootLogger.debug(`📊 Environment: ${config.app.nodeEnv}`);
        });

        container.resolve("reservationReaper").start();
        container.resolve("autoCancelWorker").start();

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
        console.error("❌ Failed to start the Booking service:", error);
        process.exit(1);
    }
}

bootstrap();
