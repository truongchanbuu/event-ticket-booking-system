module.exports = {
    apps: [
        // ─────────────────────────────────────────────────────────────
        // BOOKING SERVICE (cluster)
        // ─────────────────────────────────────────────────────────────
        {
            name: "booking",
            script: "../../booking/src/server.js", // đổi nếu file entry khác
            exec_mode: "cluster",
            instances: "max", // tận dụng hết CPU
            watch: false,
            merge_logs: true,
            max_memory_restart: "1G",
            exp_backoff_restart_delay: 200,
            kill_timeout: 5000,
            listen_timeout: 8000,
            node_args: ["--max-old-space-size=1024"],
            env: {
                NODE_ENV: "development",
                PORT: 3006,

                // Redis / Idempotency
                REDIS_URL: "redis://localhost:6379",
                IDEM_TTL_PAD_SEC: 60,

                // Booking limits / flow
                RESERVATION_MAX_QTY: 20,
                RATE_LIMIT_RES_PER_MIN: 60,
                RATE_LIMIT_PER_MINUTE: 0, // tắt RL khi benchmark local
                HOLD_TTL_SEC: 20,
                MAX_QTY_PER_LINE: 1,

                // Inline inventory (nếu có nhánh code hỗ trợ)
                BOOKING_INLINE_INVENTORY: true,

                // Kafka (bỏ qua local)
                BOOKING_DISABLE_KAFKA: true,
                KAFKA_BROKERS: "localhost:9092",
                KAFKA_CLIENT_ID: "booking-service",
                KAFKA_GROUP_ID: "booking-bg",

                // URLs / secrets
                SELF_URL: "http://localhost:3006",
                EVENT_SERVICE_SECRET_URL: "http://localhost:3002", // ← sửa từ 3000 → 3002
                EVENT_SERVICE_SECRET_KEY:
                    "b161481a1dfdbd8b7c648ef3f8ca54bd67972c4df5ecc0deb89875229c020a6f",
                SERVICE_SECRET_KEY: "dev-only",

                // HTTP client
                HTTP_TIMEOUT_MS: 1500,

                // Payment (mock/local)
                PAYMENT_SERVICE_URL: "http://localhost:3004",
                PAYMENT_SERVICE_KEY:
                    "92ace63035ad9741ad1553269e605a01a4aa8d530a8aa8924c1b72e93fba4b4f",

                // Grace / workers
                RESERVATION_GRACE_MS: 60000,
                RESERVATION_AUTOCANCEL_ENABLED: true,
                AUTOCANCEL_TICK_MS: 1500,
                AUTOCANCEL_BATCH_SIZE: 300,
                AUTOCANCEL_LOCK_TTL: 10,

                REAPER_ENABLED: true,
                REAPER_TICK_MS: 1500,
                REAPER_BATCH_SIZE: 300,
                REAPER_LOCK_TTL: 10,

                // Logging
                LOG_LEVEL: "warn",
            },
            env_production: {
                NODE_ENV: "production",
                LOG_LEVEL: "info",
                RATE_LIMIT_PER_MINUTE: 60,
                BOOKING_DISABLE_KAFKA: false,
            },
            error_file: "logs/booking.err.log",
            out_file: "logs/booking.out.log",
        },

        // ─────────────────────────────────────────────────────────────
        // EVENT SERVICE (cluster)
        // Đọc .env của bạn bằng dotenv trong app; dưới đây là override hữu ích.
        // ─────────────────────────────────────────────────────────────
        {
            name: "event",
            script: "./src/server.js", // đổi nếu entry khác (vd: ./event/src/server.js)
            exec_mode: "cluster",
            instances: "max",
            watch: false,
            merge_logs: true,
            max_memory_restart: "1G",
            exp_backoff_restart_delay: 200,
            kill_timeout: 5000,
            listen_timeout: 8000,
            node_args: ["--max-old-space-size=1024"],
            env: {
                NODE_ENV: "development",
                PORT: 3002,

                // Redis single-node local
                REDIS_BACKEND: "tcp-single",
                REDIS_URL: "redis://127.0.0.1:6379",
                REDIS_TTL: 300,

                // Availability tuning (local med)
                AVAILABILITY_CACHE_TTL_MS: 1000,
                AVAIL_EDGE_TTL_SEC: 0, // không có CDN local → 0
                AVAIL_SERVER_CACHE_MS: 1000,
                AVAIL_COALESCE_MS: 20, // local giảm để p95 đẹp

                // Inventory flags
                INVENTORY_SHARDING_ENABLED: true,
                INVENTORY_MULTI_PROBE: 1, // local giảm probe để nhẹ Lua
                INVENTORY_COMPAT_LEGACY: true,
                INVENTORY_SHARD_COUNT: 16,
                REDIS_INV_PREFIX: "inv",

                // Services
                SELF_URL: "http://localhost:3002",
                TICKET_SERVICE_URL: "http://localhost:3003/api",

                // Logs
                LOG_LEVEL: "warn",

                // Rate limit test
                RATE_LIMIT_PER_MINUTE: 0,
            },
            env_production: {
                NODE_ENV: "production",
                LOG_LEVEL: "info",
                AVAIL_COALESCE_MS: 80, // prod nên coalesce cao hơn một chút
                INVENTORY_MULTI_PROBE: 2, // cân chỉnh theo SLA
            },
            error_file: "logs/event.err.log",
            out_file: "logs/event.out.log",
        },
    ],
};
