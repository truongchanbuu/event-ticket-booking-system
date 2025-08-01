import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

/**
 * Factory function để tạo Redis client.
 * Hàm này sẽ tự động chọn client phù hợp dựa trên môi trường (production hoặc development).
 *
 * @param {object} dependencies - Các dependency cần thiết.
 * @param {object} dependencies.config - Đối tượng cấu hình của ứng dụng.
 * @returns {Promise<object|null>} - Một promise trả về Redis client đã được khởi tạo.
 */
export const createRedisClient = ({ config, logger = console }) => {
  // Kiểm tra biến môi trường để quyết định dùng client nào
  if (process.env.NODE_ENV === "production") {
    logger?.info(
      "[Redis] Production mode: Initializing Upstash Redis client..."
    );
    try {
      const { url, token } = config.upstashRedis;

      // Validate cấu hình cho production
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
      // Ném lỗi ra ngoài để ứng dụng không khởi động khi không có DB
      throw error;
    }
  } else {
    // Môi trường development hoặc các môi trường khác
    logger?.info(
      "[Redis] Development mode: Initializing local Redis client (ioredis) adapter..."
    );
    try {
      // Kết nối tới Redis cục bộ. Config được lấy từ file config để linh hoạt.
      const localRedis = new IORedis(config.localRedis);

      logger?.info("[Redis] Connected to local Redis successfully.");

      // Tạo một adapter object để mimic (bắt chước) API của @upstash/redis.
      // Điều này đảm bảo code của bạn hoạt động như nhau ở cả hai môi trường.

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
      // Trả về null hoặc ném lỗi tùy theo yêu cầu của bạn
      // Trả về null cho phép app có thể vẫn chạy mà không có Redis
      return null;
    }
  }
};
