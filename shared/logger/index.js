import pino from "pino";

/**
 * Tạo một logger factory có thể tái sử dụng và tùy biến.
 * @param {object} [options]
 * @param {string} [options.serviceName] - Tên service cho logger chính.
 * @param {string} [options.logLevel] - Mức log: 'info', 'debug', etc.
 * @param {object} [options.context] - Ngữ cảnh mặc định cho tất cả logs.
 * @returns {{
 *   logger: import('pino').Logger,
 *   createChildLogger: (context?: object) => import('pino').Logger,
 *   toPinoLogLevel: (level: number) => 'error' | 'warn' | 'info' | 'debug'
 * }}
 */
export function createLoggerFactory({
  serviceName = process.env.SERVICE_NAME || "my-app",
  logLevel = process.env.LOG_LEVEL || "info",
  nodeEnv = process.env.NODE_ENV || "development",
  context = {},
} = {}) {
  const isProduction = nodeEnv === "production";

  const developmentTransport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: true,
    },
  };

  const logger = pino({
    name: serviceName,
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: isProduction ? undefined : developmentTransport,
  }).child(context);

  const createChildLogger = (extraContext = {}) =>
    logger?.child(extraContext) ?? logger;

  const toPinoLogLevel = (level) => {
    switch (level) {
      case 1:
        return "error";
      case 2:
        return "warn";
      case 4:
        return "info";
      case 5:
        return "debug";
      default:
        return "info";
    }
  };

  return { logger, createChildLogger, toPinoLogLevel };
}
