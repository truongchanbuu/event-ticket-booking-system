import { getVisionClient } from "./google-vision";
import { getRedisClient } from "./redis";

export const visionClient = getVisionClient();
export const redisClient = getRedisClient();
