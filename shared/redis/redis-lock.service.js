import { RedisLock } from "./redis-lock";

export class RedisLockService {
  constructor({ redisService }) {
    if (!redisService) {
      throw new Error("RedisLockService requires a RedisService instance.");
    }
    this.redisService = redisService;
  }

  /**
   * Thực thi một hàm callback dưới sự bảo vệ của một distributed lock.
   * Tự động xử lý việc lấy và giải phóng khóa.
   * @param {string} resourceKey - Key định danh cho tài nguyên cần khóa.
   * @param {Function} callback - Hàm async chứa logic nghiệp vụ cần thực thi.
   * @param {object} options - Các tùy chọn cho lock (lockTimeout, retryCount...).
   * @returns {Promise<any>} - Trả về kết quả của hàm callback.
   */
  async executeWithLock(resourceKey, callback, options = {}) {
    // 1. Service sẽ tạo và quản lý instance của Lock
    const lock = new RedisLock({
      redisService: this.redisService,
      resourceKey: resourceKey,
      options: options,
    });

    try {
      // 2. Service xử lý việc lấy khóa
      const isAcquired = await lock.acquire();
      if (!isAcquired) {
        const err = new Error(
          `Could not acquire lock for resource: ${resourceKey}. It may be busy.`
        );
        err.code = "LOCK_ACQUIRE_FAILED";
        throw err;
      }

      // 3. Nếu thành công, thực thi callback của người dùng
      // và trả về kết quả của nó.
      return await callback();
    } catch (error) {
      // Re-throw lỗi để lớp gọi có thể xử lý
      throw error;
    } finally {
      // 4. LUÔN LUÔN giải phóng khóa, dù callback thành công hay thất bại
      // Đây là lợi ích lớn nhất của service này.
      await lock.release();
    }
  }
}
