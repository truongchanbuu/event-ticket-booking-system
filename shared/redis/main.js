import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

/**
 * @param {object} dependencies - Các dependency cần thiết.
 * @param {object} dependencies.config - Đối tượng cấu hình của ứng dụng.
 * @returns {Promise<object|null>} - Một promise trả về Redis client đã được khởi tạo.
 */
export const createRedisClient = ({ config, logger = console }) => {
  if (process.env.NODE_ENV === "production") {
    logger?.info(
      "[Redis] Production mode: Initializing Upstash Redis client..."
    );
    try {
      const { url, token } = config.upstashRedis;

      if (!url || !token) {
        logger?.error(
          "[Redis] FATAL: Missing Upstash Redis URL or Token for production environment."
        );
        throw new Error("Missing Upstash Redis config.");
      }

      const redisClient = new Redis({ url, token });
      logger?.info("[Redis] Upstash Redis client initialized successfully.");
      return redisClient;
    } catch (error) {
      logger?.error(
        "[Redis] Failed to initialize Upstash Redis client:",
        error
      );
      throw error;
    }
  } else {
    logger?.info(
      "[Redis] Development mode: Initializing local Redis client (ioredis) adapter..."
    );
    try {
      const localRedis = new IORedis(config.localRedis);

      logger?.info("[Redis] Connected to local Redis successfully.");

      const redisClientAdapter = {
        // get, set, del: các hàm cơ bản
        get: async (key) => await localRedis.get(key),
        set: async (key, value, opts) => {
          if (opts?.ex) return await localRedis.set(key, value, "EX", opts.ex);
          if (opts?.px) return await localRedis.set(key, value, "PX", opts.px);
          return await localRedis.set(key, value);
        },
        del: async (...keys) => await localRedis.del(keys.flat()),

        // mget: ioredis nhận 1 mảng, Upstash nhận nhiều tham số. Adapter phải xử lý.
        mget: async (...keys) => await localRedis.mget(keys),

        // pipeline/multi: Tạo một adapter cho pipeline để khớp với API của Upstash
        pipeline: () => {
          const pipeline = localRedis.pipeline();
          // Trả về một object có các phương thức giống hệt pipeline của Upstash
          return {
            get: (key) => pipeline.get(key),
            set: (key, value, opts) => pipeline.set(key, value, "EX", opts.ex),
            del: (...keys) => pipeline.del(keys),
            exec: async () => await pipeline.exec(),
          };
        },
      };

      logger?.info("[Redis] Local Redis adapter created successfully.");
      return redisClientAdapter;
    } catch (error) {
      logger?.error("[Redis] Failed to initialize local Redis client:", error);
      logger?.warn(
        "[Redis] Redis client is NOT initialized. Application may not function correctly."
      );
      return null;
    }
  }
};
