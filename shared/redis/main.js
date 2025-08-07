import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

/**
 * Tạo một Redis client đã được chuẩn hóa, hoạt động giống nhau
 * ở cả môi trường production (Upstash) và development (IORedis).
 *
 * @param {object} params
 * @param {object} params.config - Đối tượng config toàn cục của ứng dụng.
 * @param {object} [params.logger=console] - Logger để ghi log.
 * @returns {object|null} Một đối tượng client với các phương thức đã được chuẩn hóa (get, set, eval, del) hoặc null nếu có lỗi.
 */
export const createRedisClient = ({ config, logger = console }) => {
  const redisConfig = config.redis;
  let nativeClient;
  try {
    if (redisConfig.isProduction) {
      logger.info(
        "[Redis] Production environment. Initializing Upstash Redis client..."
      );
      nativeClient = new UpstashRedis({
        url: redisConfig.production.url,
        token: redisConfig.production.token,
      });
      logger.info("[Redis] Upstash Redis client initialized.");

      return {
        get: (key) => nativeClient.get(key),
        set: (key, value, options) => nativeClient.set(key, value, options),
        eval: (script, keys, args) => nativeClient.eval(script, keys, args),
        del: (key) => nativeClient.del(key),
      };
    } else {
      logger.info(
        "[Redis] Development environment. Initializing IORedis client..."
      );
      nativeClient = new IORedis(redisConfig.development.url, {
        maxRetriesPerRequest: null,
      });
      logger.info("[Redis] IORedis client initialized.");

      return {
        get: (key) => nativeClient.get(key),
        set: (key, value, options) => {
          const args = [key, value];
          if (options?.px) args.push("PX", options.px);
          if (options?.nx) args.push("NX");
          if (options?.ex) args.push("EX", options.ex);
          return nativeClient.set(...args);
        },
        eval: (script, keys, args) => {
          return nativeClient.eval(script, keys.length, ...keys, ...args);
        },
        del: (key) => nativeClient.del(key),
        sadd: (key, member) => nativeClient.sadd(key, member),
      };
    }
  } catch (error) {
    logger.error("[Redis] Failed to initialize Redis client:", error);
    return null;
  }
};
