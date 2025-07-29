/**
 * Chuyển đổi một giá trị thành chuỗi JSON an toàn để lưu vào Redis.
 * @param {any} value - Giá trị cần chuyển đổi.
 * @returns {string | null}
 */
export function serialize(value) {
  if (value === undefined) {
    return null; // JSON không thể biểu diễn `undefined`
  }
  return JSON.stringify(value);
}

/**
 * Chuyển đổi một chuỗi từ Redis trở lại thành giá trị JavaScript gốc.
 * @param {string | null} value - Chuỗi từ Redis.
 * @returns {any}
 */
export function deserialize(value) {
  if (value === null || typeof value !== "string") {
    return value; // Trả về ngay nếu không phải là chuỗi hoặc đã là null
  }
  try {
    return JSON.parse(value); // Thử phân tích chuỗi JSON
  } catch (e) {
    return value; // Nếu lỗi, trả về chuỗi gốc
  }
}
