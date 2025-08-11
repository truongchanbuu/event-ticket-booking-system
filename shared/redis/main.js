import IORedis, { Cluster } from "ioredis";

function buildCommonSingleOptions(cfg) {
  const {
    maxRetriesPerRequest = 2,
    enableAutoPipelining = true,
    connectTimeoutMs = 5000,
    keepAlive = 0,
  } = cfg;

  return {
    lazyConnect: true,
    enableAutoPipelining,
    maxRetriesPerRequest,
    connectTimeout: connectTimeoutMs,
    keepAlive,
    retryStrategy: (times) => {
      return times > 10 ? null : Math.min(times * 100, 3000);
    },
    reconnectOnError: (err) => {
      const msg = err.message || "";
      return /READONLY|LOADING|ETIMEDOUT|ECONNRESET/.test(msg);
    },
  };
}

function buildCommonClusterOptions(cfg, readOnly) {
  const {
    maxRetriesPerRequest = 2,
    enableAutoPipelining = true,
    connectTimeoutMs = 5000,
    keepAlive = 0,
  } = cfg;

  return {
    scaleReads: readOnly ? "slave" : "master", // "replica" alias
    redisOptions: {
      lazyConnect: true,
      enableAutoPipelining,
      maxRetriesPerRequest,
      connectTimeout: connectTimeoutMs,
      keepAlive,
      retryStrategy: (times) => {
        return times > 10 ? null : Math.min(times * 100, 3000);
      },
      reconnectOnError: (err) => {
        const msg = err.message || "";
        return /READONLY|LOADING|ETIMEDOUT|ECONNRESET/.test(msg);
      },
    },
    slotsRefreshTimeout: connectTimeoutMs,
    slotsRefreshInterval: 2000,
  };
}

export function createRedisClient({ config, logger = console }) {
  const backend = config.redis.backend;

  if (backend === "tcp-single") {
    const url = config.redis.single?.url;
    if (!url) throw new Error("[Redis] Missing single.url");
    const tlsEnabled =
      !!config.redis.single?.tls || url.startsWith("rediss://");

    const options = buildCommonSingleOptions(config.redis);
    if (tlsEnabled) {
      options.tls = {}; // enable TLS with default settings
    }

    const io = new IORedis(url, options);
    logger.info("[Redis] Using TCP single-node (ioredis)");

    return {
      kind: "tcp-single",
      raw: io,
      // basic
      get: (k) => io.get(k),
      setEx: (k, v, ttlSec) => io.setex(k, ttlSec, v),
      setex: (k, ttlSec, v) => io.setex(k, ttlSec, v),
      del: (...keys) => (keys.length ? io.del(...keys) : Promise.resolve(0)),
      sadd: (k, ...members) => io.sadd(k, ...members),
      smembers: (k) => io.smembers(k),
      mget: (keys) => (keys?.length ? io.mget(...keys) : Promise.resolve([])),
      // script
      script: (sub, lua) => io.script(sub, lua),
      evalsha: (sha, numKeys, ...args) => io.evalsha(sha, numKeys, ...args),
      eval: (lua, numKeys, ...args) => io.eval(lua, numKeys, ...args),
      // scan
      scan: (cursor, ...args) => io.scan(cursor, ...args),
      // lifecycle
      connect: async () => {
        const st = io.status;
        if (st === "connecting" || st === "connect" || st === "ready") return;
        await io.connect();
        await io.ping();
      },
      quit: async () => {
        try {
          await io.quit();
        } catch {}
      },
      ping: () => io.ping(),
    };
  }

  if (backend === "tcp-cluster") {
    const nodes = config.redis.cluster?.nodes;
    if (!nodes?.length) throw new Error("[Redis] Missing cluster.nodes");
    const tlsEnabled =
      !!config.redis.cluster?.tls ||
      nodes.some((n) => n.startsWith("rediss://"));
    const readOnly = !!config.redis.cluster?.readOnlyReplicas;

    const clusterOpts = buildCommonClusterOptions(config.redis, readOnly);
    if (tlsEnabled) {
      clusterOpts.redisOptions.tls = {};
    }

    const cluster = new Cluster(nodes, clusterOpts);
    logger.info("[Redis] Using TCP cluster (ioredis)");

    return {
      kind: "tcp-cluster",
      raw: cluster,
      get: (k) => cluster.get(k),
      setEx: (k, v, ttlSec) => cluster.setex(k, ttlSec, v),
      setex: (k, ttlSec, v) => cluster.setex(k, ttlSec, v),
      del: (...keys) =>
        keys.length ? cluster.del(...keys) : Promise.resolve(0),
      sadd: (k, ...members) => cluster.sadd(k, ...members),
      smembers: (k) => cluster.smembers(k),
      mget: (keys) =>
        keys?.length ? cluster.mget(...keys) : Promise.resolve([]),
      script: (sub, lua) => cluster.script(sub, lua),
      evalsha: (sha, numKeys, ...args) =>
        cluster.evalsha(sha, numKeys, ...args),
      eval: (lua, numKeys, ...args) => cluster.eval(lua, numKeys, ...args),
      scan: (cursor, ...args) => cluster.scan(cursor, ...args),
      connect: async () => {
        const st = cluster.status;
        if (st === "connecting" || st === "connect" || st === "ready") return;
        await cluster.connect();
        await cluster.ping();
      },
      quit: async () => {
        try {
          await cluster.quit();
        } catch {}
      },
      ping: () => cluster.ping(),
    };
  }

  throw new Error(`[Redis] Unknown backend: ${backend}`);
}
