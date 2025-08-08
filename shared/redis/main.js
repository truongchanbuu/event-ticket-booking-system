// redis/createRedisClient.ts
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

export function createRedisClient({ config, logger = console }) {
  const { backend } = config.redis;

  if (backend === "upstash-rest") {
    const { url, token } = config.redis.production.upstashRest;
    logger.info("[Redis] Using Upstash REST");
    const up = new UpstashRedis({ url, token });
    return {
      get: (k) => up.get(k),
      setEx: (k, v, ttlSec) => up.set(k, v, { ex: ttlSec }),
      del: (...keys) => up.del(...keys),
      sadd: (k, ...members) => up.sadd(k, ...members),
      smembers: (k) => up.smembers(k),
      mget: (keys) => up.mget(...keys),
      quit: async () => {}, // no-op
    };
  }

  if (backend === "tcp") {
    const url =
      config.redis.production.tcp.url || config.redis.development.tcp.url;
    const io = new IORedis(url, {
      enableAutoPipelining: true,
      maxRetriesPerRequest: 2,
    });
    logger.info("[Redis] Using TCP (ioredis)");
    return {
      get: (k) => io.get(k),
      setEx: (k, v, ttlSec) => io.setex(k, ttlSec, v),
      del: (...keys) => (keys.length ? io.del(...keys) : 0),
      sadd: (k, ...members) => io.sadd(k, ...members),
      smembers: (k) => io.smembers(k),
      mget: (keys) => (keys?.length ? io.mget(...keys) : Promise.resolve([])),
      quit: async () => {
        try {
          await io.quit();
        } catch {}
      },
    };
  }

  throw new Error(`[Redis] Unknown backend: ${backend}`);
}
