import { randomUUID } from "crypto";

// interface LockOptions {
//   lockTimeout?: number; // Thời gian khóa tự hết hạn (ms), ví dụ 5000ms
//   retryDelay?: number;  // Thời gian chờ tối thiểu giữa các lần thử lại (ms)
//   retryCount?: number;  // Số lần thử lại tối đa
// }

export class RedisLock {
  constructor({ redisClient, key, options }) {
    if (!key) {
      throw new Error("Lock key cannot be empty.");
    }
    this.redisClient = redisClient;
    this.key = `lock:${key}`;

    // Gán giá trị mặc định cho các options
    this.options = {
      lockTimeout: options?.lockTimeout || 10000, // 10 giây
      retryDelay: options?.retryDelay || 50, // 50 ms
      retryCount: options?.retryCount || 3, // 3 lần
    };
  }

  async acquire() {
    this.lockValue = randomUUID();

    for (let i = 0; i < this.options.retryCount; i++) {
      const result = await this.redis.set(
        this.key,
        this.lockValue,
        "PX", // Đơn vị là milliseconds
        this.options.lockTimeout,
        "NX" // Chỉ set nếu key chưa tồn tại
      );

      if (result === "OK") {
        // Lấy khóa thành công!
        return true;
      }

      // Thất bại, chờ và thử lại
      const delay = Math.random() * this.options.retryDelay + 50; // Jitter backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Hết số lần thử, thất bại
    this.lockValue = null;
    return false;
  }

  //   async with(fn) {
  //     const acquired = await this.acquire();
  //     if (!acquired) throw new Error("Failed to acquire lock");
  //     try {
  //       return await fn();
  //     } finally {
  //       await this.release();
  //     }
  //   }

  static RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  async release() {
    if (!this.lockValue) {
      // Không có khóa nào đang được giữ bởi instance này
      return;
    }

    try {
      // Gọi Lua script để giải phóng khóa một cách nguyên tử
      await this.redis.eval(
        RedisLock.RELEASE_SCRIPT,
        1, // Số lượng key
        this.key, // KEYS[1]
        this.lockValue // ARGV[1]
      );
    } finally {
      // Dù thành công hay thất bại, reset trạng thái của instance
      this.lockValue = null;
    }
  }
}
