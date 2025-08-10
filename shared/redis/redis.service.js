import { createHash } from "crypto";
import { serialize, deserialize } from "./serialize.js";

export class RedisService {
  constructor({ config = {}, logger = console, redisClient }) {
    this.prefix = config.prefix || "app";
    this.defaultTTL = Number(config.defaultTTL || 300);
    this.logger = logger;
    this.r = redisClient;
    this._inflight = new Map();
    this.loadedScripts = new Map();
    this.SHA_SET_TAG = null;

    // Atomic: SET(EX) + SADD
    this.LUA_SET_TAG = `
      local k = KEYS[1]
      local tagKey = KEYS[2]
      local ttl = tonumber(ARGV[1])
      local payload = ARGV[2]
      local doTag = ARGV[3]

      if ttl > 0 then
        redis.call('SETEX', k, ttl, payload)
      else
        redis.call('SET', k, payload)
      end

      if doTag == '1' and tagKey and #tagKey > 0 then
        redis.call('SADD', tagKey, k)
      end
      return 1
    `;
  }

  // ---------- private utils ----------
  _sha1(s) {
    return createHash("sha1").update(s).digest("hex");
  }
  _key = (k) => `${this.prefix}:${k}`;
  _jit = (ttl) => {
    const base = Number(ttl) || this.defaultTTL;
    const delta = Math.max(1, Math.floor(base * 0.1)); // ±10%
    return base + Math.floor((Math.random() * 2 - 1) * delta);
  };

  async _scriptLoad(lua) {
    const loaded = await this.r.script("LOAD", lua);
    return loaded || this._sha1(lua);
  }
  async _evalsha(sha, keys, args) {
    return this.r.evalsha(sha, keys.length, ...keys, ...args);
  }
  async _eval(lua, keys, args) {
    return this.r.eval(lua, keys.length, ...keys, ...args);
  }

  // ---------- lifecycle ----------
  /** Gọi sau khi tạo service: await redisService.initialize() */
  async initialize() {
    try {
      this.SHA_SET_TAG = await this._scriptLoad(this.LUA_SET_TAG);
      this.loadedScripts.set(this.SHA_SET_TAG, this.LUA_SET_TAG);
      this.logger.info("[Redis] LUA_SET_TAG loaded", { sha: this.SHA_SET_TAG });
    } catch (e) {
      this.SHA_SET_TAG = null;
      this.logger.warn("[Redis] Could not load LUA_SET_TAG; will fallback", {
        e: e.message,
      });
    }
  }

  // ---------- core get/set ----------
  async get(key) {
    const k = this._key(key);
    try {
      const raw = await this.r.get(k);
      if (raw == null) return null;
      try {
        return deserialize(raw);
      } catch (e2) {
        this.logger.warn(`[Redis] Bad JSON at ${k}; purging`, {
          e: e2.message,
        });
        try {
          await this.r.del(k);
        } catch {}
        return null;
      }
    } catch (e) {
      this.logger.error(`[Redis] GET ${k}`, { e: e.message });
      return null;
    }
  }

  async getRaw(key) {
    const k = this._key(key);
    try {
      return await this.r.get(k);
    } catch (e) {
      this.logger.error(`[Redis] GET RAW ${k}`, { e: e.message });
      return null;
    }
  }

  async set(key, value, { ttl = this.defaultTTL, trackingKey } = {}) {
    const k = this._key(key);
    const tagKey = trackingKey ? this._key(trackingKey) : null;
    try {
      const payload = serialize(value);
      if (payload && payload.length > 512 * 1024) {
        this.logger.warn(
          `[Redis] Skip large value ${k} size=${payload.length}`
        );
        return false;
      }
      const ttlJit = this._jit(ttl);

      // Atomic path when trackingKey is provided and Lua is available
      if (trackingKey && this.SHA_SET_TAG) {
        try {
          await this._evalsha(
            this.SHA_SET_TAG,
            [k, tagKey],
            [String(ttlJit), payload, "1"]
          );
          return true;
        } catch (err) {
          const msg = String(err?.message || err);
          if (msg.includes("NOSCRIPT")) {
            // Re-load and retry once
            this.logger.debug(
              "[Redis] NOSCRIPT for LUA_SET_TAG → reload & EVAL"
            );
            this.SHA_SET_TAG = await this._scriptLoad(this.LUA_SET_TAG);
            await this._eval(
              this.LUA_SET_TAG,
              [k, tagKey],
              [String(ttlJit), payload, "1"]
            );
            return true;
          }
          throw err;
        }
      }

      // Fallback: simple SETEX (no tag) or SETEX then SADD (non-atomic)
      await this.r.setex(k, ttlJit, payload);
      if (trackingKey) await this.r.sadd(tagKey, k);
      return true;
    } catch (e) {
      this.logger.error(`[Redis] SET ${k}`, { e: e.message });
      return false;
    }
  }

  async setRaw(key, stringValue, { ttl = 0 } = {}) {
    const k = this._key(key);
    if (ttl > 0) return this.r.setex(k, ttl, stringValue);
    return this.r.set(k, stringValue);
  }

  async del(...keys) {
    const full = keys.flat().filter(Boolean).map(this._key);
    if (!full.length) return 0;
    try {
      return await this.r.del(...full);
    } catch (e) {
      this.logger.error(`[Redis] DEL ${full.length} keys`, { e: e.message });
      return 0;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL, { trackingKey } = {}) {
    const k = this._key(key);
    const cached = await this.get(key);
    if (cached !== null) return cached;

    if (this._inflight.has(k)) return this._inflight.get(k);

    const p = (async () => {
      try {
        const val = await fetchFn();
        if (val !== undefined && val !== null) {
          await this.set(key, val, { ttl, trackingKey });
        }
        return val;
      } finally {
        this._inflight.delete(k);
      }
    })();

    this._inflight.set(k, p);
    return p;
  }

  // ---------- bulk ops ----------
  async mget(keys) {
    if (!keys?.length) return [];
    const full = keys.map(this._key);
    try {
      const raws = await this.r.mget(...full);
      return raws.map((v) => (v == null ? null : deserialize(v)));
    } catch (e) {
      this.logger.error(`[Redis] MGET ${full.length}`, { e: e.message });
      return keys.map(() => null);
    }
  }

  async mgetRaw(keys) {
    if (!keys?.length) return [];
    const full = keys.map(this._key);
    try {
      return await this.r.mget(...full);
    } catch (e) {
      this.logger.error(`[Redis] MGET RAW ${full.length}`, { e: e.message });
      return keys.map(() => null);
    }
  }

  async eval(lua, keys = [], args = []) {
    return this._eval(lua, keys, args);
  }

  async evalsha(sha, keys = [], args = []) {
    return this._evalsha(sha, keys, args);
  }

  async scriptLoad(lua) {
    if (!lua) throw new Error("Lua script is required for scriptLoad");
    try {
      const sha = await this._scriptLoad(lua);
      this.loadedScripts.set(sha, lua);
      this.logger.info("[Redis] Script loaded", { sha });
      return sha;
    } catch (e) {
      this.logger.error("[Redis] scriptLoad failed", { e: e.message });
      throw e;
    }
  }

  // ---------- tagging & invalidation ----------
  async invalidateByTrackingKey(tag, opts = {}) {
    const { debug = true, sample = 10, useUnlink = true } = opts;
    const tagKey = this._key(tag);
    try {
      const members = await this.r.smembers(tagKey);
      if (!members?.length) {
        if (debug) this.logger.info(`[Redis] Tag empty: ${tagKey}`);
        return 0;
      }

      if (debug) {
        const show = members.slice(0, sample);
        this.logger.info(
          `[Redis] Tag ${tagKey} has ${members.length} members. Sample:`,
          show
        );
        try {
          // Lấy TTL một số key để chắc là mình đang xoá đúng thứ
          const p = this.r.pipeline();
          show.forEach((k) => p.pttl(k));
          const ttls = (await p.exec()).map((x) => x[1]);
          this.logger.info(`[Redis] PTTL sample (ms):`, ttls);
        } catch {}
      }

      // Chunked DEL/UNLINK to avoid huge commands
      const CHUNK = 256;
      for (let i = 0; i < members.length; i = CHUNK) {
        const batch = members.slice(i, i + CHUNK);
        await this.r.del(...batch);
        if (useUnlink && typeof this.r.unlink === "function") {
          await this.r.unlink(...batch);
        } else {
          await this.r.del(...batch);
        }
      }
      await this.r.del(tagKey);
      this.logger.info(
        `[Redis] Invalidated ${members.length} keys by ${tagKey}`
      );
      return members.length;
    } catch (e) {
      this.logger.error(`[Redis] Invalidate ${tagKey}`, { e: e.message });
      return 0;
    }
  }

  /**
   * Danger: pattern delete using SCAN. Use tags if possible.
   * @param {string} pattern Redis MATCH pattern without prefix (e.g., "events:search:*")
   * @param {number} count SCAN COUNT hint
   */
  async delPattern(pattern, count = 1000) {
    const match = this._key(pattern);
    let cursor = "0";
    let total = 0;
    try {
      do {
        const [next, keys] = await this.r.scan(
          cursor,
          "MATCH",
          match,
          "COUNT",
          count
        );
        cursor = next;
        if (keys.length) {
          total += keys.length;
          // chunked delete
          const CHUNK = 256;
          for (let i = 0; i < keys.length; i += CHUNK) {
            await this.r.del(...keys.slice(i, i + CHUNK));
          }
        }
      } while (cursor !== "0");
      this.logger.info(`[Redis] delPattern '${pattern}' deleted ${total} keys`);
      return total;
    } catch (e) {
      this.logger.error(`[Redis] delPattern '${pattern}' failed`, {
        e: e.message,
      });
      return 0;
    }
  }
}
