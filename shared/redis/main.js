// import { Redis } from "@upstash/redis";
// import config from "../config/index.js";

// let redisClient = null;

// const { url, token } = config.upstashRedis;

// if (url && token) {
//   console.info("[Redis] Upstash config found. Initializing Redis client...");
//   redisClient = new Redis({
//     url,
//     token,
//   });
//   console.info("[Redis] Redis client initialized successfully.");
// } else {
//   console.warn(
//     "[Redis] Upstash config missing. Redis client is NOT initialized."
//   );
// }

// export default redisClient;

// TODO: Redis DEV
// lib/redis.ts
import config from "../config/index.js";

let redisClient = null;

if (process.env.NODE_ENV === "production") {
  // Production: dùng Upstash
  const { Redis } = await import("@upstash/redis");
  const { url, token } = config.upstashRedis;
  if (!url || !token) throw new Error("Missing Upstash config");
  redisClient = new Redis({ url, token });
} else {
  // Dev: mock lại API của @upstash/redis bằng ioredis
  const IORedis = (await import("ioredis")).default;
  const localRedis = new IORedis();

  redisClient = {
    get: async (key) => await localRedis.get(key),
    set: async (key, value, opts) => {
      if (opts?.ex) return await localRedis.set(key, value, "EX", opts.ex);
      if (opts?.px) return await localRedis.set(key, value, "PX", opts.px);
      return await localRedis.set(key, value);
    },
    del: async (key) => await localRedis.del(key),
    // add more if needed (e.g. expire, hset, etc.)
  };
}

export default redisClient;
