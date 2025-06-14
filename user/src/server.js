import { KafkaManager } from "@event_ticket_booking_system/shared";
import createApp from "./app.js";
import { ENV } from "./config/env.js";
import kafkaConfig from "./config/kafka.config.js";

async function bootstrap() {
    KafkaManager.initKafka(kafkaConfig);
    await KafkaManager.getProducer("user-producer");

    const app = await createApp();
    const PORT = ENV.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 User service running on port ${PORT}`);
    });

    await KafkaManager.disconnectKafka();
}

bootstrap().catch((e) => {
    console.error("❌ Failed to start the user service", e);
    process.exit(1);
});
