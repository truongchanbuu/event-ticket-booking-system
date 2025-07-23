import { Redis } from "@upstash/redis";
import config from "../config/index.js";

let redisClient = null;

const { url, token } = config.upstashRedis;

if (url && token) {
  console.info("[Redis] Upstash config found. Initializing Redis client...");
  redisClient = new Redis({
    url,
    token,
  });
  console.info("[Redis] Redis client initialized successfully.");
} else {
  console.warn(
    "[Redis] Upstash config missing. Redis client is NOT initialized."
  );
}

export default redisClient;
