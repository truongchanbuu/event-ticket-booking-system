// tests/stubs/shared.js
export class AppError extends Error {
    constructor({ message, errorCode, statusCode }) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
    }
}

export const ERROR_CODE = {
    INVALID_DATA: "INVALID_DATA",
    NOT_FOUND: "NOT_FOUND",
};

export const PROVIDER_TYPE_MAP = {
    momo: "WALLET",
    zalopay: "WALLET",
    stripe: "CARD",
};

// Các export khác nếu test sau này cần đến
export const TOPICS = { PAYMENTS: "payments", AVAILABILITY: "availability" };
export const buildEnvelope = (type, payload, meta) => ({ type, payload, meta });

// Mock Redis service tối thiểu (nếu test nào đó đụng tới)
export class RedisService {
    async del() {}
    async getOrSet(_key, loader) {
        return loader ? loader() : null;
    }
}

// (Tuỳ) MessageDispatcher/Kafka… nếu cần sau này:
// export class MessageDispatcher { async dispatch() {} }
