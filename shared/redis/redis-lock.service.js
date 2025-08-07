import { randomUUID } from "crypto";

export class LockAcquireFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = "LockAcquireFailedError";
  }
}

export class RedisLockService {
  constructor({ redisClient, logger = console }) {
    if (!redisClient) {
      throw new Error("RedisLock Service requires a standardized redisClient.");
    }
    this.redis = redisClient;
    this.logger = logger;
  }

  static RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  async executeWithLock(resourceKey, callback, options = {}) {
    const lockKey = `lock:${resourceKey}`;
    const lockValue = randomUUID();

    const finalOptions = {
      lockTimeout: options.lockTimeout || 10000,
      retryCount: options.retryCount || 3,
      retryDelay: options.retryDelay || 50,
    };

    let isAcquired = false;

    for (let i = 0; i < finalOptions.retryCount; i++) {
      const result = await this.redis.set(lockKey, lockValue, {
        px: finalOptions.lockTimeout,
        nx: true,
      });

      if (result === "OK" || result === 1) {
        isAcquired = true;
        this.logger.debug(`[Lock] Acquired lock for key ${lockKey}`);
        break;
      }

      if (i < finalOptions.retryCount - 1) {
        const delay = Math.random() * finalOptions.retryDelay + 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!isAcquired) {
      throw new LockAcquireFailedError(
        `Could not acquire lock for resource: ${resourceKey} after ${finalOptions.retryCount} retries.`
      );
    }

    try {
      return await callback();
    } finally {
      this.redis
        .eval(RedisLockService.RELEASE_SCRIPT, [lockKey], [lockValue])
        .then((result) => {
          if (result === 1) {
            this.logger.debug(`[Lock] Released lock for key ${lockKey}`);
          }
        })
        .catch((err) => {
          this.logger.error(
            `[Lock] CRITICAL: Failed to release lock for key ${lockKey}`,
            err
          );
        });
    }
  }
}
