import { createApp } from './app';
import { ENV } from './config/env';

async function bootstrap() {
  const app = await createApp();
  const PORT = ENV.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`🚀 Ticket service running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start the app', err);
  process.exit(1);
});
