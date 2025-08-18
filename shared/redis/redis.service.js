import { createHash } from "crypto";
import { serialize, deserialize } from "./serialize.js";

export class RedisService {
  constructor({ config = {}, logger = console, redisClient }) {
    this.prefix = config.prefix ?? process.env.REDIS_PREFIX ?? "";
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
  _key = (k) => (this.prefix ? `${this.prefix}:${k}` : k);
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
    const ks = this._key ? keys.map((k) => this._key(k)) : keys;
    return this.r.evalsha(sha, ks.length, ...ks, ...args);
  }
  async _eval(lua, keys, args) {
    const ks = this._key ? keys.map((k) => this._key(k)) : keys;
    return this.r.eval(lua, ks.length, ...ks, ...args);
  }
  _normalizeZaddPairs(pairs) {
    // chấp nhận:
    // - [[score, member], ...]
    // - [{ score, member }, ...]
    // - { member: score, ... }
    // - [score, member, score, member, ...] (giữ nguyên)
    if (!pairs) return [];
    if (Array.isArray(pairs)) {
      if (pairs.length === 0) return [];
      if (typeof pairs[0] !== "object") return pairs;

      const flat = [];
      for (const it of pairs) {
        if (Array.isArray(it)) {
          flat.push(it[0], it[1]);
        } else if (it && typeof it === "object") {
          flat.push(it.score, it.member);
        }
      }
      return flat;
    }
    if (typeof pairs === "object") {
      const flat = [];
      for (const m of Object.keys(pairs)) {
        flat.push(pairs[m], m);
      }
      return flat;
    }
    return [];
  }

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

  async quit() {
    try {
      if (typeof this.r?.quit === "function") {
        return await this.r.quit();
      }
      if (typeof this.raw?.quit === "function") {
        return await this.raw.quit(); // fallback ioredis raw
      }
      this.logger.debug("[RedisService] quit(): no-op");
    } catch (e) {
      this.logger.warn("[RedisService] quit error:", e?.message || e);
    }
  }

  async connect() {
    if (typeof this.r?.connect === "function") {
      return this.r.connect();
    }
    this.logger.debug("[RedisService] connect(): no-op");
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

  async set(
    key,
    value,
    { ttl = this.defaultTTL, trackingKey, noJitter = false } = {}
  ) {
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

      const ttlJit = noJitter ? ttl : this._jit(ttl);

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

  async setex(key, ttlSec, value) {
    const k = this._key(key);
    try {
      const payload = typeof value === "string" ? value : serialize(value);
      if (payload && payload.length > 512 * 1024) {
        this.logger.warn(
          `[Redis] Skip large value ${k} size=${payload.length}`
        );
        return false;
      }
      const ttl = Math.max(1, Number(ttlSec) | 0);

      if (typeof this.r?.setex === "function") {
        const res = await this.r.setex(k, ttl, payload);
        return res === "OK" || res === 1 || res === true;
      }

      const setter = this.r?.raw?.set
        ? this.r.raw.set.bind(this.r.raw)
        : this.r.set?.bind(this.r);
      if (!setter) throw new Error("SETEX_UNSUPPORTED");

      const res = await setter(k, payload, "EX", ttl);
      return res === "OK" || res === 1 || res === true;
    } catch (e) {
      this.logger.error(`[Redis] SETEX ${k}`, { e: e.message });
      return false;
    }
  }

  // Chỉ set nếu key chưa tồn tại, có TTL (giây). Trả về true/false
  async setNXEx(key, value, ttl = this.defaultTTL, { jitter = true } = {}) {
    const k = this._key(key);
    try {
      const payload = serialize(value);
      if (payload && payload.length > 512 * 1024) {
        this.logger.warn(
          `[Redis] Skip large value ${k} size=${payload.length}`
        );
        return false;
      }

      const ttlSec = Number(jitter ? this._jit(ttl) : ttl) || this.defaultTTL;

      // Ưu tiên dùng wrapper setNXEx nếu có (client đã cung cấp)
      if (typeof this.r?.setNXEx === "function") {
        const res = await this.r.setNXEx(k, ttlSec, payload);
        return res === "OK" || res === 1 || res === true;
      }

      const setter = this.r?.raw?.set
        ? this.r.raw.set.bind(this.r.raw)
        : this.r.set.bind(this.r);
      const res = await setter(k, payload, "EX", ttlSec, "NX");
      return res === "OK" || res === 1 || res === true;
    } catch (e) {
      this.logger.error(`[Redis] setNXEx ${k}`, { e: e.message });
      return false;
    }
  }

  exists = async (key) => {
    const k = this._key(key);
    try {
      const n = this.r?.raw?.exists
        ? await this.r.raw.exists(k)
        : await this.r.exists(k);
      return n === 1;
    } catch (e) {
      this.logger.error(`[Redis] EXISTS ${k}`, { e: e.message });
      return false;
    }
  };

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

  hgetall = async (k) => {
    const key = this._key(k);
    if (this.r?.raw?.hgetall) return this.r.raw.hgetall(key);
    if (this.r?.hgetall) return this.r.hgetall(key);
    if (this.r?.sendCommand) return this.r.sendCommand(["HGETALL", key]);
    throw new Error("HGETALL_UNSUPPORTED");
  };

  hget = async (k, f) => {
    const key = this._key(k);
    if (this.r?.raw?.hget) return this.r.raw.hget(key, f);
    if (this.r?.hget) return this.r.hget(key, f);
    if (this.r?.sendCommand) return this.r.sendCommand(["HGET", key, f]);
    throw new Error("HGET_UNSUPPORTED");
  };

  hset = async (k, f, v) => {
    const key = this._key(k);
    if (this.r?.raw?.hset) return this.r.raw.hset(key, f, v);
    if (this.r?.hset) return this.r.hset(key, f, v);
    if (this.r?.sendCommand) return this.r.sendCommand(["HSET", key, f, v]);
    throw new Error("HSET_UNSUPPORTED");
  };

  pttl = async (key) => {
    const k = this._key(key);
    try {
      const ms = this.r?.raw?.pttl
        ? await this.r.raw.pttl(k)
        : await this.r.pttl(k);
      return typeof ms === "number" ? ms : -2;
    } catch (e) {
      this.logger.error(`[Redis] PTTL ${k}`, { e: e.message });
      return -2;
    }
  };

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

  async zrangebyscore(key, min, max, opts = {}) {
    const k = this._key(key);
    const args = [String(min), String(max)];

    if (opts.withScores) args.push("WITHSCORES");
    if (opts.limit) {
      const off = Number(opts.limit.offset ?? 0);
      const cnt = Number(opts.limit.count ?? 50);
      args.push("LIMIT", String(off), String(cnt));
    }

    try {
      const raw = this.r?.raw?.zrangebyscore
        ? await this.r.raw.zrangebyscore(k, ...args)
        : await this.r.zrangebyscore(k, ...args);

      if (opts.withScores && opts.parse) {
        const out = [];
        for (let i = 0; i < raw.length; i += 2) {
          out.push({ member: raw[i], score: Number(raw[i + 1]) });
        }
        return out;
      }
      return raw;
    } catch (e) {
      this.logger.error(`[Redis] ZRANGEBYSCORE ${k}`, { e: e.message });
      throw e;
    }
  }

  /** ZREM nhiều member */
  async zrem(key, ...members) {
    const k = this._key(key);
    const flat = members.flat().filter((m) => m != null);
    if (!flat.length) return 0;
    try {
      return this.r?.raw?.zrem
        ? await this.r.raw.zrem(k, ...flat)
        : await this.r.zrem(k, ...flat);
    } catch (e) {
      this.logger.error(`[Redis] ZREM ${k}`, { e: e.message });
      throw e;
    }
  }

  multi() {
    const cli = this.r?.raw?.multi ? this.r.raw : this.r;
    if (!cli?.multi) throw new Error("MULTI_UNSUPPORTED");
    return cli.multi();
  }

  pipeline() {
    const cli = this.r?.raw?.pipeline ? this.r.raw : this.r;
    if (!cli?.pipeline) throw new Error("PIPELINE_UNSUPPORTED");
    return cli.pipeline();
  }

  async eval(lua, keys = [], args = []) {
    return this._eval(lua, keys, args);
  }

  async evalsha(sha, keys = [], args = []) {
    return this._evalsha(sha, keys, args);
  }

  async zadd(key, pairsOrScore, memberOrOpts, ...rest) {
    const k = this._key(key);

    const passThrough =
      (typeof pairsOrScore === "number" || typeof pairsOrScore === "string") &&
      (memberOrOpts !== undefined || rest.length > 0);

    let args = [];
    if (passThrough) {
      args = [pairsOrScore, memberOrOpts, ...rest];
    } else {
      let opts = {};
      let pairs = pairsOrScore;

      if (
        memberOrOpts &&
        typeof memberOrOpts === "object" &&
        !Array.isArray(memberOrOpts)
      ) {
        opts = memberOrOpts;
      }

      const flags = [];
      if (opts.NX) flags.push("NX");
      if (opts.XX) flags.push("XX");
      if (opts.CH) flags.push("CH");
      if (opts.INCR) flags.push("INCR");

      const flatPairs = this._normalizeZaddPairs(pairs);
      args = [...flags, ...flatPairs];
    }

    try {
      if (this.r?.raw?.zadd) {
        return await this.r.raw.zadd(k, ...args);
      }

      if (this.r?.raw?.zAdd) {
        return await this.r.raw.zAdd(k, ...args);
      }

      return await this.r.zadd(k, ...args);
    } catch (e) {
      this.logger.error(`[Redis] ZADD ${k}`, { e: e.message });
      throw e;
    }
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
