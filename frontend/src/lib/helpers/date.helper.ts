/**
 * Chuyển đổi chuỗi ngày từ 'DD/MM/YYYY' sang 'YYYY-MM-DD'.
 * @param {string} ddmmyyyyDate Chuỗi ngày dạng DD/MM/YYYY.
 * @returns {string} Chuỗi ngày dạng YYYY-MM-DD hoặc chuỗi rỗng nếu đầu vào không hợp lệ.
 */
export const toInputFormat = (ddmmyyyyDate) => {
  if (!ddmmyyyyDate || typeof ddmmyyyyDate !== "string") return "";
  const parts = ddmmyyyyDate.split("/");
  if (parts.length !== 3) return ""; // Không phải định dạng DD/MM/YYYY
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};
