import createApp from "./app.js";
import { ENV } from "./config/env.js";
import kafkaService from "./services/kafka.service.js";

let server;

async function bootstrap() {
    try {
        // Initialize Kafka
        console.log("🔌 Initializing Kafka connection...");
        await kafkaService.initialize();
        console.log("✅ Kafka connection established");

        // Create and start the app
        const app = await createApp();
        const PORT = ENV.PORT || 3000;

        server = app.listen(PORT, () => {
            console.log(`🚀 Auth service running on port ${PORT}`);
            console.log(`📊 Environment: ${ENV.NODE_ENV}`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = async (signal) => {
            console.log(
                `\n🛑 Received ${signal}. Starting graceful shutdown...`,
            );

            if (server) {
                server.close(() => {
                    console.log("✅ HTTP server closed");
                });
            }

            try {
                await kafkaService.disconnect();
                console.log("✅ Kafka connections closed");
            } catch (error) {
                console.error("❌ Error closing Kafka connections:", error);
            }

            process.exit(0);
        };

        // Handle shutdown signals
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    } catch (error) {
        console.error("❌ Failed to start the auth service:", error);
        process.exit(1);
    }
}

bootstrap().catch((e) => {
    console.error("❌ Failed to start the auth service", e);
    process.exit(1);
});
