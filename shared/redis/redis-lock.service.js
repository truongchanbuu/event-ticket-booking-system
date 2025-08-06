import Redlock from "redlock";

export class RedisLockService {
  constructor({ redisClient }) {
    if (!redisClient) {
      throw new Error(
        "RedisLockService requires a Redis client instance (e.g., from ioredis)."
      );
    }

    this.redlock = new Redlock([redisClient], {
      retryCount: 3,
      retryDelay: 200,
    });

    this.redlock.on("error", (error) => {
      console.error("[Redlock Error] An error occurred:", error);
    });
  }

  /**
   * Thực thi một hàm callback bên trong một lock sử dụng redlock.
   * Đây là phương pháp an toàn và được khuyên dùng.
   * @param {string} resourceKey Key của tài nguyên cần khóa
   * @param {function} callback Hàm để thực thi
   * @param {object} [options={}] Tùy chọn, ví dụ: { duration: 15000 } để set TTL là 15s
   * @returns {Promise<any>}
   */
  async executeWithLock(resourceKey, callback, options = {}) {
    if (!resourceKey || typeof resourceKey !== "string") {
      throw new Error("resourceKey must be a non-empty string");
    }

    const lockKey = `lock:${resourceKey}`;
    const duration = options.duration || 10000;

    try {
      return await this.redlock.using([lockKey], duration, callback);
    } catch (error) {
      if (error.name === "LockError") {
        const err = new Error(
          `Could not acquire lock for resource: ${lockKey}. Resource is busy.`
        );
        err.code = "LOCK_ACQUIRE_FAILED";
        throw err;
      }
      throw error;
    }
  }
}
