// file: redis.service.js
import { serialize, deserialize } from "./serialize.js";

/**
 * RedisService (Definitive "Upstash-First" Version):
 * - Được xây dựng dựa trên tài liệu chính thức của Upstash để đảm bảo hoạt động hoàn hảo trên production.
 * - Tự động phát hiện và tương thích ngược với ioredis để không gây lỗi ở môi trường development.
 */
export class RedisService {
  constructor({ prefix = "app", defaultTTL = 300, logger = console, client }) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.logger = logger;
    this.client = client;

    if (!this.client || typeof this.client.get !== "function") {
      this.logger.warn(
        "[RedisService] Redis client is not available or is mocked. Caching is disabled."
      );
      this.client = null;
    }
  }

  _key(key) {
    return `${this.prefix}:${key}`;
  }

  // --- Các hàm cơ bản với serialize/deserialize rõ ràng ---

  async get(key) {
    if (!this.client) return null;
    try {
      const val = await this.client.get(this._key(key));
      return deserialize(val);
    } catch (err) {
      this.logger.error(`[RedisService] GET error`, {
        key: this._key(key),
        error: err.message,
      });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.client) return false;
    try {
      await this.client.set(this._key(key), serialize(value), { EX: ttl });
      return true;
    } catch (err) {
      this.logger.error(`[RedisService] SET error`, {
        key: this._key(key),
        error: err.message,
      });
      return false;
    }
  }

  async del(keys) {
    if (!this.client) return 0;
    const keysToDelete = (Array.isArray(keys) ? keys : [keys]).map((k) =>
      this._key(k)
    );
    if (keysToDelete.length === 0) return 0;
    try {
      return await this.client.del(keysToDelete);
    } catch (err) {
      this.logger.error(`[RedisService] DEL error`, {
        keys: keysToDelete.join(", "),
        error: err.message,
      });
      return 0;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  // --- Các hàm phức tạp hơn với logic tương thích ---

  /**
   * [HYBRID] Hỗ trợ cả `mget(...keys)` của Upstash và `mget(keysArray)` của ioredis.
   */
  async mget(keys = []) {
    if (!this.client || keys.length === 0) return [];
    const fullKeys = keys.map((k) => this._key(k));
    try {
      // Kiểm tra xem client có hỗ trợ `mget` nhận một mảng không (chuẩn của ioredis)
      // `mget.length` sẽ là 1 cho hàm `function(arg1){...}`
      if (this.client.mget.length === 1) {
        const results = await this.client.mget(fullKeys);
        return results.map(deserialize);
      }
      // Mặc định, dùng cú pháp của Upstash
      const results = await this.client.mget(...fullKeys);
      return results.map(deserialize);
    } catch (err) {
      this.logger.error(`[RedisService] MGET error`, { error: err.message });
      return keys.map(() => null);
    }
  }

  /**
   * [UPSTASH-FIRST] Luôn ưu tiên dùng `client.pipeline()` vì đây là API chuẩn của Upstash và ioredis hiện đại.
   * Cung cấp fallback cho các trường hợp khác để đảm bảo không lỗi.
   */
  async pipelineOps(ops = []) {
    if (!this.client || ops.length === 0) return;

    // Ưu tiên `pipeline()`
    if (typeof this.client.pipeline === "function") {
      const queue = this.client.pipeline();
      ops.forEach((op) => this._addOpToQueue(queue, op));
      await queue.exec();
      return;
    }

    // Fallback cho `multi()`
    if (typeof this.client.multi === "function") {
      const queue = this.client.multi();
      ops.forEach((op) => this._addOpToQueue(queue, op));
      await queue.exec();
      return;
    }

    // Fallback cuối cùng: Chạy tuần tự và cảnh báo
    this.logger.warn(
      "[RedisService] Client does not support pipeline/multi. Running pipelineOps sequentially."
    );
    for (const op of ops) {
      if (op.type === "del") await this.del(op.key);
      else if (op.type === "set") await this.set(op.key, op.value, op.ttl);
    }
  }

  /** @private Helper để thêm lệnh vào queue */
  _addOpToQueue(queue, op) {
    const key = this._key(op.key);
    if (op.type === "del") {
      queue.del(key);
    } else if (
      op.type === "set" &&
      op.value !== null &&
      op.value !== undefined
    ) {
      queue.set(key, serialize(op.value), { EX: op.ttl || this.defaultTTL });
    }
  }
}
