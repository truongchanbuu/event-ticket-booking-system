import pino from "pino";

// === STEP 1: Cấu hình Logger ===

/**
 * Cấu hình cho transport pino-pretty chỉ dành cho môi trường development.
 * Giúp log hiển thị đẹp và dễ đọc trên console.
 */
const developmentTransport = {
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "SYS:standard", // Định dạng thời gian dễ đọc theo hệ thống
    ignore: "pid,hostname", // Bỏ qua các trường ít quan trọng khi dev
    singleLine: true, // Hiển thị log trên một dòng cho gọn
  },
};

/**
 * Tạo một instance logger gốc (root logger) cho toàn bộ ứng dụng.
 * Logger này sẽ là "cha" của tất cả các child logger sau này.
 * - Trong production, nó sẽ xuất ra định dạng JSON hiệu suất cao.
 * - Trong development, nó sẽ dùng pino-pretty để hiển thị đẹp mắt.
 */
export const rootLogger = pino({
  // Đặt tên cho dịch vụ, lấy từ biến môi trường hoặc đặt mặc định.
  name: process.env.SERVICE_NAME || "my-app",

  // Cấp độ log, lấy từ biến môi trường hoặc đặt 'info' làm mặc định.
  // Các cấp độ: 'fatal', 'error', 'warn', 'info', 'debug', 'trace'.
  level: process.env.LOG_LEVEL || "info",

  // Pino sẽ tự động thêm timestamp.
  // Chúng ta có thể tùy chỉnh định dạng nếu muốn.
  timestamp: pino.stdTimeFunctions.isoTime, // Định dạng ISO 8601 dễ đọc và chuẩn hóa

  // Chỉ sử dụng transport 'pino-pretty' nếu KHÔNG phải môi trường production.
  transport:
    process.env.NODE_ENV === "production" ? undefined : developmentTransport,
});

// === STEP 2: Hàm tạo Child Logger ===

/**
 * Tạo ra một logger con (child logger) từ logger gốc.
 * Logger con này sẽ kế thừa tất cả cấu hình của logger cha
 * và được đính kèm thêm một bộ "ngữ cảnh" (context) cố định.
 *
 * Mọi thông điệp được ghi bởi logger con sẽ tự động chứa các trường context này.
 *
 * @param {object} context - Một object chứa các thuộc tính bạn muốn thêm vào mỗi log entry.
 * Ví dụ: { requestID: '...', userID: '...', eventSourceName: '...' }
 * @returns {import('pino').Logger} - Một instance logger mới của pino đã được đính kèm context.
 */
export const createChildLogger = (context = {}) => {
  // Sử dụng phương thức .child() của pino để tạo logger con.
  // Đây là cách làm hiệu suất cao và được khuyến khích.
  return rootLogger.child(context);
};

/**
 * Chuyển đổi level log của kafkajs (dạng số) sang của pino (dạng chuỗi).
 * @param {number} level - Log level từ kafkajs (ERROR:1, WARN:2, INFO:4, DEBUG:5).
 * @returns {'error' | 'warn' | 'info' | 'debug'}
 */
export const toPinoLogLevel = (level) => {
  switch (level) {
    case 1: // kafkajs.logLevel.ERROR
      return "error";
    case 2: // kafkajs.logLevel.WARN
      return "warn";
    case 4: // kafkajs.logLevel.INFO
      return "info";
    case 5: // kafkajs.logLevel.DEBUG
      return "debug";
    default:
      return "info"; // Mặc định là info
  }
};
