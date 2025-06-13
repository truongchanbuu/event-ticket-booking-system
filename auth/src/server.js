import createApp from "./app.js";
import { ENV } from "./config/env.js";
import { KafkaManager, KafkaUtils } from "@event_ticket_booking_system/shared";
import kafkaConfig from "./config/kafka.config.js";

async function bootstrap() {
    // Initiate Kafka
    KafkaManager.initKafka(kafkaConfig);
    await KafkaManager.getProducer("auth-producer");

    const app = await createApp();
    const PORT = ENV.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Auth service running on port ${PORT}`);
    });

    await setupGracefulShutdown();
}

bootstrap().catch((e) => {
    console.error("❌ Failed to start the auth service", e);
    process.exit(1);
});
