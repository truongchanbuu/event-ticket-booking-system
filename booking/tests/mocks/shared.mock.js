// Minimal test-double cho shared pkg

export const checkJson = () => (_req, _res, next) => next();

export const errorHandler = (err, req, res, next) => {
    const statusCode = err?.statusCode ?? 500;
    const body = {
        success: false,
        message: err?.message ?? "INTERNAL",
        errorCode: err?.errorCode ?? "INTERNAL",
        statusCode,
        data: null,
    };
    if (res.headersSent) return next(err);
    res.status(statusCode).json(body);
};

export const ERROR_CODE = {
    INVALID_DATA: "INVALID_DATA",
    INTERNAL: "INTERNAL",
    NOT_FOUND: "NOT_FOUND",
    BAD_REQUEST: "BAD_REQUEST",
};

export class AppError extends Error {
    constructor({
        message = "Error",
        statusCode = 400,
        errorCode = "INVALID_DATA",
        errors = null,
    } = {}) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.errors = errors;
    }
}

// Kafka/event helpers (đủ cho ReservationProducer)
export const TOPICS = { BOOKING: "booking", EVENT: "event" };
export const RESERVATION_CREATED = "reservation.created.v1";
export const RESERVATION_EXPIRED = "reservation.expired.v1";
export const RESERVATION_CANCELLED = "reservation.cancelled.v1";
export const buildEnvelope = ({ type, version, payload, meta }) =>
    JSON.stringify({
        type,
        version,
        payload,
        meta,
        ts: new Date().toISOString(),
    });

// catchAsync cho controller
export const catchAsync = (fn) => (req, res, next) =>
    Promise.resolve(fn.call(this, req, res, next)).catch(next);

// config dùng trong src/config/index.js
export const redisConfig = { url: "redis://test" };

export class BaseValidator {}
