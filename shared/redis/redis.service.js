import { serialize, deserialize } from "./serialize.js";

export class RedisService {
  constructor({ prefix = "app", defaultTTL = 300, logger = console, client }) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.logger = logger;
    this.client = client;

    // TODO: Open when prod
    // if (
    //   !this.client ||
    //   typeof this.client.get !== "function" ||
    //   typeof this.client.set !== "function"
    // ) {
    //   throw new Error(
    //     "[RedisService] A valid Redis client instance was not provided."
    //   );
    // }
    if (!this.client || typeof this.client.get !== "function") {
      console.warn("[RedisService] Redis client is mocked or disabled.");
    }
  }

  _key(key) {
    return `${this.prefix}:${key}`;
  }

  async get(key) {
    const k = this._key(key);
    try {
      const val = await this.client.get(k);
      if (val !== null) {
        this.logger?.debug?.(`[RedisService] CACHE HIT key=${k}`);
      } else {
        this.logger?.debug?.(`[RedisService] CACHE MISS key=${k}`);
      }
      return deserialize(val);
    } catch (err) {
      this.logger?.error(`[RedisService] get error key=${k}`, err);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    const k = this._key(key);
    try {
      await this.client.set(k, serialize(value), { ex: ttl });
      this.logger?.debug?.(`[RedisService] SET key=${k} ttl=${ttl}`);
      return true;
    } catch (err) {
      this.logger?.error(`[RedisService] set error key=${k}`, err);
      return false;
    }
  }

  async del(keys) {
    if (!this.client) return 0;
    const keysToDelete = (Array.isArray(keys) ? keys : [keys]).map((k) =>
      this._key(k)
    );
    try {
      if (keysToDelete.length === 0) return 0;
      return await this.client.del(keysToDelete);
    } catch (err) {
      this.logger?.error(
        `[RedisService] del error keys=${keysToDelete.join(", ")}`,
        err
      );
      return 0;
    }
  }

  async getOrSet(key, ttlOrFn, maybeFn) {
    let ttl;
    let fetchFn;
    if (typeof ttlOrFn === "function") {
      fetchFn = ttlOrFn;
      ttl = this.defaultTTL;
    } else {
      ttl = ttlOrFn ?? this.defaultTTL;
      fetchFn = maybeFn;
    }
    if (typeof fetchFn !== "function") {
      throw new Error("getOrSet requires a fetchFn");
    }

    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      this.logger?.debug(`[RedisService] hit ${this.prefix}:${key}`);
      return cached;
    }

    this.logger?.debug(
      `[RedisService] miss ${this.prefix}:${key}, fetching...`
    );
    const data = await fetchFn();
    if (data !== undefined) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  /**
   * 3. Tối ưu hiệu năng: Sử dụng MGET gốc
   */
  async mget(keys = []) {
    if (!keys.length) return [];
    const fullKeys = keys.map((k) => this._key(k));
    try {
      const results = await this.client.mGet(fullKeys);
      return results.map(deserialize);
    } catch (err) {
      this.logger?.error(`[RedisService] mget error`, err);
      return keys.map(() => null);
    }
  }

  /**
   * Multi-get convenience (uses pipeline-like approach if client supports).
   */
  async mget(keys = []) {
    if (!this.client || !keys.length) return [];
    const fullKeys = keys.map((k) => this._key(k));
    try {
      // @upstash/redis hỗ trợ mget
      const results = await this.client.mget(...fullKeys);
      return results.map(deserialize);
    } catch (err) {
      this.logger?.error(`[RedisService] mget error`, err);
      return keys.map(() => null);
    }
  }

  /**
   * Multi-set convenience (loop).
   */
  async mset(entries = [], ttl = this.defaultTTL) {
    if (!this.client || !entries.length) return;
    try {
      const pipe = this.client.pipeline();
      entries.forEach(([key, value]) => {
        const k = this._key(key);
        pipe.set(k, serialize(value), { ex: ttl });
      });
      // Thực thi tất cả các lệnh trong pipeline bằng một request duy nhất
      await pipe.exec();
      this.logger?.debug?.(
        `[RedisService] MSET ${entries.length} keys with ttl=${ttl}`
      );
    } catch (err) {
      this.logger?.error?.(`[RedisService] mset error`, err);
    }
  }

  async multiDelAndSet(ops = []) {
    if (!ops.length) return;

    try {
      if (typeof this.client.pipeline === "function") {
        const p = this.client.pipeline();
        for (const op of ops) {
          const key = this._key(op.key);
          if (op.type === "del") {
            p.del(key);
          } else if (op.type === "set") {
            // Upstash không hỗ trợ setex option trực tiếp -> dùng pipeline set + expire
            p.set(key, serialize(op.value));
            if (op.ttl) p.expire(key, op.ttl);
          }
        }
        await p.exec();
        this.logger?.debug?.(
          `[RedisService] multiDelAndSet pipeline with ${ops.length} operations`
        );
      } else {
        // Fallback sequential (nếu không có pipeline)
        for (const op of ops) {
          if (op.type === "del") await this.del(op.key);
          else if (op.type === "set") await this.set(op.key, op.value, op.ttl);
        }
      }
    } catch (err) {
      this.logger?.error?.(`[RedisService] multiDelAndSet error`, err);
    }
  }

  async pipelineOps(ops = []) {
    if (!this.client || !ops.length) return;

    try {
      const p = this.client.pipeline();
      for (const op of ops) {
        const key = this._key(op.key);
        if (op.type === "del") {
          p.del(key);
        } else if (op.type === "set") {
          // Gộp set và expire trong pipeline chỉ tốn 1 command
          p.set(key, serialize(op.value), { ex: op.ttl || this.defaultTTL });
        }
      }
      await p.exec();
      this.logger?.debug?.(
        `[RedisService] Executed pipeline with ${ops.length} operations`
      );
    } catch (err) {
      this.logger?.error?.(`[RedisService] pipelineOps error`, err);
    }
  }
}
