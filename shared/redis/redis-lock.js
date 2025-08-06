import { randomUUID } from "crypto";

// interface LockOptions {
//   lockTimeout?: number; // Thời gian khóa tự hết hạn (ms), ví dụ 5000ms
//   retryDelay?: number;  // Thời gian chờ tối thiểu giữa các lần thử lại (ms)
//   retryCount?: number;  // Số lần thử lại tối đa
// }

export class RedisLock {
  constructor({ redisService, key, options }) {
    if (!key) {
      throw new Error("Lock key cannot be empty.");
    }
    this.redisService = redisService;
    this.key = `lock:${key}`;
    this.lockValue = null;
    this.options = {
      lockTimeout: options?.lockTimeout || 10000, // 10 giây
      retryDelay: options?.retryDelay || 50, // 50 ms
      retryCount: options?.retryCount || 3, // 3 lần
    };
  }

  async acquire() {
    this.lockValue = randomUUID();

    for (let i = 0; i < this.options.retryCount; i++) {
      const result = await this.redisService.setnx(
        this.key,
        this.lockValue,
        this.options.lockTimeout
      );

      if (result === "OK" || result === 1) {
        console.log(`[Lock] Acquired lock for key ${this.key}`);
        return true;
      }

      const delay = Math.random() * this.options.retryDelay + 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lockValue = null;
    return false;
  }

  static RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  async release() {
    if (!this.lockValue) {
      return;
    }

    console.log(
      `[Lock] Releasing lock for key ${this.key} with value ${this.lockValue}`
    );

    try {
      // Gọi Lua script để giải phóng khóa một cách nguyên tử
      await this.redisService.eval(
        RedisLock.RELEASE_SCRIPT,
        [this.key],
        [this.lockValue]
      );
    } finally {
      this.lockValue = null;
    }
  }
}
