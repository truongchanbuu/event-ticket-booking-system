import pino from "pino";

/**
 * @param {Object} context - Logging context object
 * LogContext { requestID?: string; userID?: string; service?: string; [key: string]: any; }
 */
export const createLogger = (context = {}) =>
  pino({
    name: process.env.SERVICE_NAME || "unknown-service",
    level: process.env.LOG_LEVEL || "info",
    base: {
      ...context,
      service: process.env.SERVICE_NAME || "unknown-service",
      timeStamp: Date.now(),
    },
    transport:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
  });
