import { serialize, deserialize } from "./serialize.js";

export class RedisService {
  constructor({ config, logger, redisClient }) {
    this.prefix = config.redis.prefix || "app";
    this.defaultTTL = config.redis.defaultTTL || 300;
    this.logger = logger;
    this.redisClient = redisClient;

    if (!this.redisClient) {
      this.logger.warn(
        "[RedisService] Redis client not available. Caching is disabled."
      );
    }
  }

  _key(key) {
    return `${this.prefix}:${key}`;
  }

  async get(key) {
    if (!this.redisClient) return null;
    try {
      const val = await this.redisClient.get(this._key(key));
      return deserialize(val);
    } catch (err) {
      this.logger.error(
        `[RedisService] GET error for key: ${this._key(key)}`,
        err
      );
      return null;
    }
  }

  async set(key, value, options = {}) {
    if (!this.redisClient) return false;

    const { ttl = this.defaultTTL, trackingKey } = options;
    const fullKey = this._key(key);

    try {
      await this.redisClient.set(fullKey, serialize(value), { ex: ttl });

      if (trackingKey) {
        await this.redisClient.sadd(this._key(trackingKey), fullKey);
      }

      return true;
    } catch (err) {
      this.logger.error(`[RedisService] SET error for key: ${fullKey}`, err);
      return false;
    }
  }

  async del(keys) {
    if (!this.redisClient) return 0;
    const keysToDelete = (Array.isArray(keys) ? keys : [keys]).map((k) =>
      this._key(k)
    );
    if (keysToDelete.length === 0) return 0;

    try {
      return await this.redisClient.del(...keysToDelete);
    } catch (err) {
      this.logger.error(
        `[RedisService] DEL error for keys: ${keysToDelete.join(", ")}`,
        err
      );
      return 0;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      this.logger.debug(`[RedisService] Cache HIT for key: ${this._key(key)}`);
      return cached;
    }

    this.logger.debug(`[RedisService] Cache MISS for key: ${this._key(key)}`);
    const data = await fetchFn();

    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  async invalidateByTrackingKey(trackingKey) {
    if (!this.redisClient) return 0;

    const fullTrackingKey = this._key(trackingKey);

    try {
      const keysToDelete = await this.redisClient.smembers(fullTrackingKey);

      if (keysToDelete.length === 0) {
        return 0;
      }

      await this.redisClient.del(...keysToDelete, fullTrackingKey);

      this.logger.info(
        `[Invalidate] Invalidated ${keysToDelete.length} keys tracked by ${fullTrackingKey}`
      );
      return keysToDelete.length;
    } catch (err) {
      this.logger.error(
        `[Invalidate] Error for tracking key: ${fullTrackingKey}`,
        err
      );
      return 0;
    }
  }
}
