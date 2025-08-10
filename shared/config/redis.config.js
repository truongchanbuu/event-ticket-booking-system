import dotenv from "dotenv";
import path from "path";

const env = process.env.NODE_ENV || "development";
const envFiles = [`.env.${env}`, `.env`];
for (const f of envFiles) {
  dotenv.config({ path: path.resolve(process.cwd(), f) });
}

const isProduction = env === "production";
function parseClusterNodes(str) {
  if (!str) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((n) => {
      // Cho phép cả "redis://host:port" hoặc "host:port"
      if (n.startsWith("redis://") || n.startsWith("rediss://")) return n;
      return `redis://${n}`;
    });
}

export const redisConfig = {
  prefix: process.env.REDIS_PREFIX ?? "app",
  defaultTTL: Number.parseInt(process.env.REDIS_TTL ?? "300", 10),

  /**
   * Backend:
   *  - "tcp-single": Memorystore Redis (standard tier) hoặc 1 node TCP
   *  - "tcp-cluster": Memorystore Redis Cluster (sharded)
   */
  backend:
    process.env.REDIS_BACKEND ?? (isProduction ? "tcp-single" : "tcp-single"),

  // Cấu hình single-node
  single: {
    // Ví dụ: redis://10.0.0.12:6379  (Memorystore Private IP)
    // Hoặc rediss://host:port nếu dùng TLS
    url: process.env.REDIS_URL,
    tls:
      process.env.REDIS_TLS === "1" ||
      process.env.REDIS_URL?.startsWith("rediss://"),
    password: process.env.REDIS_PASSWORD || undefined, // nếu bật AUTH
  },

  // Cấu hình cluster (Memorystore Redis Cluster)
  cluster: {
    // CSV "10.0.1.23:6379,10.0.1.24:6379" hoặc full url dạng redis://...
    nodes: parseClusterNodes(process.env.REDIS_CLUSTER_NODES),
    tls:
      process.env.REDIS_CLUSTER_TLS === "1" ||
      (process.env.REDIS_CLUSTER_NODES || "").includes("rediss://"),
    readOnlyReplicas: process.env.REDIS_CLUSTER_READONLY === "1", // scaleReads=replica
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Tuning chung cho ioredis
  ioredis: {
    enableAutoPipelining: process.env.REDIS_AUTOPIPE === "0" ? false : true, // default: true
    maxRetriesPerRequest: Number.parseInt(
      process.env.REDIS_MAX_RETRIES_PER_REQ ?? "2",
      10
    ),
    connectTimeoutMs: Number.parseInt(
      process.env.REDIS_CONNECT_TIMEOUT_MS ?? "5000",
      10
    ),
    keepAlive: Number.parseInt(process.env.REDIS_KEEPALIVE ?? "0", 10),
  },
};

/** Validate rõ ràng cho production */
export function validateRedisConfig(cfg = redisConfig) {
  const be = cfg.backend;

  if (be === "tcp-single") {
    if (isProduction && !cfg.single.url) {
      throw new Error(
        "FATAL: REDIS_URL required for tcp-single in production."
      );
    }
  } else if (be === "tcp-cluster") {
    if (
      isProduction &&
      (!cfg.cluster.nodes || cfg.cluster.nodes.length === 0)
    ) {
      throw new Error(
        "FATAL: REDIS_CLUSTER_NODES required for tcp-cluster in production."
      );
    }
  } else {
    throw new Error(`FATAL: Unsupported REDIS_BACKEND: ${be}`);
  }
}
