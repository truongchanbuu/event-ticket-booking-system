import "dotenv/config";

export default {
  port: process.env.PORT,
  vision: {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
};
