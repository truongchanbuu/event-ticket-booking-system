import createApp from "./app.js";
import { ENV } from "./config/env.js";
import { initProducer } from "./kafka/procuder.js";
import { shutdownKafka } from "./kafka/shutdown.js";

async function bootstrap() {
    await initProducer();
    const app = await createApp();
    const PORT = ENV.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Auth service running on port ${PORT}`);
    });

    process.on("SIGINT", async () => {
        await shutdownKafka();
        process.exit(0);
    });
    process.on("SIGTERM", async () => {
        await shutdownKafka();
        process.exit(0);
    });
}

bootstrap().catch((e) => {
    console.error("❌ Failed to start the auth service", e);
    process.exit(1);
});
