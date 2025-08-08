import dotenv from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const envFile = `.env`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const isProduction = env === 'production';
const redisConfig = {
  prefix: process.env.REDIS_PREFIX || 'app',
  defaultTTL: parseInt(process.env.REDIS_TTL, 10) || 300,

  isProduction: isProduction,
  production: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  development: {
    url: `redis://${process.env.LOCAL_REDIS_HOST || '127.0.0.1'}:${process.env.LOCAL_REDIS_PORT || 6379}`,
  },
};

if (
  isProduction &&
  (!redisConfig.production.url || !redisConfig.production.token)
) {
  throw new Error(
    'FATAL ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be defined for production.',
  );
}

const config = {
  app: {
    port: process.env.PORT || 3000,
    nodeEnv: env,
    serviceKey: process.env.SERVICE_SECRET_KEY,
  },
  redis: redisConfig,
  service_keys: {},
  service_urls: {},
};

// console.log(`${config.kafka.brokers} - ${process.env.KAFKA_BROKERS}`);
// if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
//   throw new Error('FATAL ERROR: KAFKA_BROKERS is not defined.');
// }

export default config;
