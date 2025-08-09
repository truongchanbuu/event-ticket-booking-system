import { createHash } from "crypto";
import { serialize, deserialize } from "./serialize.js";

export class RedisService {
  constructor({ config, logger, redisClient }) {
    this.prefix = config.redis?.prefix || "app";
    this.defaultTTL = Number(config.redis?.defaultTTL) || 300;
    this.logger = logger || console;
    this.r = redisClient || null;
    this._inflight = new Map();
    this.loadedScripts = new Map();
  }

  _sha1(s) {
    return createHash("sha1").update(s).digest("hex");
  }
  _key = (k) => `${this.prefix}:${k}`;
  _jit = (ttl) => {
    const base = Number(ttl) || this.defaultTTL;
    const delta = Math.max(1, Math.floor(base * 0.1));
    return base + Math.floor((Math.random() * 2 - 1) * delta);
  };

  // --- helpers để tương thích cả node-redis & ioredis ---
  async _setWithTTL(k, payload, ttlSec) {
    // node-redis v4: setEx; ioredis: set(key, value, 'EX', ttl)
    if (typeof this.r.setEx === "function") {
      return this.r.setEx(k, payload, ttlSec);
    }
    return this.r.set(k, payload, "EX", ttlSec);
  }
  async _scriptLoad(lua) {
    if (typeof lua !== "string" || lua.length === 0) {
      throw new Error(
        "[RedisService] scriptLoad(lua): invalid lua script (empty/undefined)"
      );
    }

    if (typeof this.r.script === "function") {
      return this.r.script("LOAD", lua); // ioredis
    }
    if (typeof this.r.sendCommand === "function") {
      return this.r.sendCommand(["SCRIPT", "LOAD", lua]);
    }
    return null;
  }
  async _evalsha(sha, keys, args) {
    if (typeof this.r.evalsha === "function") {
      return this.r.evalsha(sha, keys.length, ...keys, ...args);
    }
    if (typeof this.r.sendCommand === "function") {
      return this.r.sendCommand([
        "EVALSHA",
        sha,
        String(keys.length),
        ...keys,
        ...args.map(String),
      ]);
    }
    throw new Error("EVALSHA not supported by client");
  }
  async _eval(lua, keys, args) {
    if (typeof this.r.eval === "function") {
      return this.r.eval(lua, keys.length, ...keys, ...args);
    }
    if (typeof this.r.sendCommand === "function") {
      return this.r.sendCommand([
        "EVAL",
        lua,
        String(keys.length),
        ...keys,
        ...args.map(String),
      ]);
    }
    throw new Error("EVAL not supported by client");
  }

  // --- high-level APIs ---
  async get(key) {
    if (!this.r) return null;
    const k = this._key(key);
    try {
      const raw = await this.r.get(k);
      return raw == null ? null : deserialize(raw);
    } catch (e) {
      this.logger.error(`[Redis] GET ${k}`, { e: e.message });
      return null;
    }
  }

  // Raw getter cho inventory/availability (không deserialize)
  async getRaw(key) {
    if (!this.r) return null;
    const k = this._key(key);
    try {
      const raw = await this.r.get(k);
      return raw; // string | null
    } catch (e) {
      this.logger.error(`[Redis] GET RAW ${k}`, { e: e.message });
      return null;
    }
  }

  async set(key, value, { ttl = this.defaultTTL, trackingKey } = {}) {
    if (!this.r) return false;
    const k = this._key(key);
    try {
      const payload = serialize(value);
      if (payload && payload.length > 512 * 1024) {
        this.logger.warn(
          `[Redis] Skip large value ${k} size=${payload.length}`
        );
        return false;
      }
      await this._setWithTTL(k, payload, this._jit(ttl));
      if (trackingKey) await this.r.sadd(this._key(trackingKey), k);
      return true;
    } catch (e) {
      this.logger.error(`[Redis] SET ${k}`, { e: e.message });
      return false;
    }
  }

  async setRaw(key, stringValue, { ttl = 0 } = {}) {
    const k = this._key(key);
    if (ttl > 0) return this._setWithTTL(k, stringValue, ttl);
    return this.r.set(k, stringValue);
  }

  async del(...keys) {
    if (!this.r) return 0;
    const full = keys.flat().filter(Boolean).map(this._key);
    if (!full.length) return 0;
    try {
      return await this.r.del(...full);
    } catch (e) {
      this.logger.error(`[Redis] DEL ${full.join(",")}`, { e: e.message });
      return 0;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL, { trackingKey } = {}) {
    const hit = await this.get(key);
    console.log(`[HIT CACHE: ${JSON.stringify(hit)}]`);
    if (hit !== null) return hit;

    if (this._inflight.has(key)) return this._inflight.get(key);
    const p = (async () => {
      try {
        const val = await fetchFn();
        if (val !== undefined && val !== null)
          await this.set(key, val, { ttl, trackingKey });
        return val;
      } finally {
        this._inflight.delete(key);
      }
    })();
    this._inflight.set(key, p);
    return p;
  }

  async invalidateByTrackingKey(tag) {
    if (!this.r) return 0;
    const tagKey = this._key(tag);
    try {
      const members = await this.r.smembers(tagKey);
      if (!members?.length) return 0;
      await this.r.del(...members, tagKey);
      this.logger.info(
        `[Redis] Invalidated ${members.length} keys by ${tagKey}`
      );
      return members.length;
    } catch (e) {
      this.logger.error(`[Redis] Invalidate ${tagKey}`, { e: e.message });
      return 0;
    }
  }

  // MGET có 2 biến thể: object và raw
  async mget(keys) {
    if (!this.r || !keys?.length) return [];
    const full = keys.map(this._key);
    try {
      const raws = await this.r.mget(full);
      return raws.map((v) => (v == null ? null : deserialize(v)));
    } catch (e) {
      this.logger.error(`[Redis] MGET`, { e: e.message });
      return keys.map(() => null);
    }
  }

  async mgetRaw(keys) {
    if (!this.r || !keys?.length) return [];
    const full = keys.map(this._key);
    try {
      return await this.r.mget(full); // (string|null)[]
    } catch (e) {
      this.logger.error(`[Redis] MGET RAW`, { e: e.message });
      return keys.map(() => null);
    }
  }

  // --- Lua support (SCRIPT LOAD / EVALSHA) ---
  async scriptLoad(lua) {
    const sha = this._sha1(lua);
    try {
      const loaded = await this._scriptLoad(lua);
      this.loadedScripts.set(sha, lua);
      return loaded || sha;
    } catch (err) {
      this.logger.warn("[Redis] SCRIPT LOAD failed; fallback to EVAL.", {
        err,
      });
      this.loadedScripts.set(sha, lua);
      return sha;
    }
  }

  async evalsha(sha, keys = [], args = []) {
    try {
      return await this._evalsha(sha, keys.map(this._key), args);
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes("NOSCRIPT")) {
        const lua = this.loadedScripts.get(sha);
        if (!lua) throw err;
        this.logger.debug("[Redis] NOSCRIPT → fallback EVAL");
        return await this.eval(lua, keys, args);
      }
      throw err;
    }
  }

  async eval(lua, keys = [], args = []) {
    return this._eval(lua, keys.map(this._key), args);
  }
}
