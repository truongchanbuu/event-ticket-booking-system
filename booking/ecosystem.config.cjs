module.exports = {
    apps: [
        {
            name: "booking",
            script: "./src/server.js", // Đảm bảo đây là đường dẫn đúng tới file chính của bạn
            instances: "max", // Sử dụng tối đa số lõi CPU
            exec_mode: "cluster", // Chạy dưới dạng cluster (nhiều tiến trình)
            env: {
                PORT: 3006,
                REDIS_URL: "redis://localhost:6379",
                IDEM_TTL_PAD_SEC: 60,
                RESERVATION_MAX_QTY: 20,
                RATE_LIMIT_RES_PER_MIN: 60,
                KAFKA_BROKERS: "localhost:9092",
                KAFKA_CLIENT_ID: "booking-service",
                KAFKA_GROUP_ID: "booking-bg",
                SELF_URL: "http://localhost:3006",
                EVENT_SERVICE_SECRET_URL: "http://localhost:3000",
                EVENT_SERVICE_SECRET_KEY:
                    "b161481a1dfdbd8b7c648ef3f8ca54bd67972c4df5ecc0deb89875229c020a6f",
                SERVICE_SECRET_KEY: "dev-only",
                HTTP_TIMEOUT_MS: 1500,
                PAYMENT_SERVICE_URL: "http://localhost:3004",
                PAYMENT_SERVICE_KEY:
                    "92ace63035ad9741ad1553269e605a01a4aa8d530a8aa8924c1b72e93fba4b4f",
                RESERVATION_GRACE_MS: 60000, // 60s grace window
                RESERVATION_AUTOCANCEL_ENABLED: true, // bật worker auto-cancel
                AUTOCANCEL_TICK_MS: 1500,
                AUTOCANCEL_BATCH_SIZE: 300,
                AUTOCANCEL_LOCK_TTL: 10,
                REAPER_ENABLED: true,
                REAPER_TICK_MS: 1500,
                REAPER_BATCH_SIZE: 300,
                REAPER_LOCK_TTL: 10,
                LOG_LEVEL: "warn",
                BOOKING_DISABLE_KAFKA: true,
                RATE_LIMIT_PER_MINUTE: 0,
                HOLD_TTL_SEC: 900,
                MAX_QTY_PER_LINE: 1,
                BOOKING_INLINE_INVENTORY: true,
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
