import client from "prom-client";

// 1 registry dùng chung
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// Counter: cache hit/miss ở server-side cache của A2
export const availabilityCacheHit = new client.Counter({
    name: "availability_cache_hit_total",
    help: "Server-side cache hits for /events/:slug/availability",
});
export const availabilityCacheMiss = new client.Counter({
    name: "availability_cache_miss_total",
    help: "Server-side cache misses for /events/:slug/availability",
});

// Histogram: latency endpoint (không label theo slug để tránh cardinality cao)
export const availabilityLatency = new client.Histogram({
    name: "availability_latency_seconds",
    help: "Latency of GET /events/:slug/availability",
    // buckets hợp lý cho mục tiêu P95 < 50ms (~0.05s)
    buckets: [0.005, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.2, 0.5, 1],
    labelNames: ["method", "route", "status_code"],
});

registry.registerMetric(availabilityCacheHit);
registry.registerMetric(availabilityCacheMiss);
registry.registerMetric(availabilityLatency);
