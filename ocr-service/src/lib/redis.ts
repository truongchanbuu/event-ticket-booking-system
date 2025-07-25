import { Redis } from "@upstash/redis";
import config from "../config";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    });

    console.log("[RedisClient] Initialized Upstash Redis Client (HTTP-based).");
  }

  return redisClient;
}
