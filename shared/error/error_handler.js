import AppError from "./app_error.js";
import error_code from "./error_code.js";

export const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    console.error(err);
  }

  // Nếu lỗi đã là một AppError rồi, chỉ cần gửi nó đi
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      errors: err.errors,
    });
  }

  // === PHẦN MỞ RỘNG QUAN TRỌNG ===
  // Xử lý các lỗi "thô" từ service và chuyển đổi chúng thành AppError
  let customError = err;

  // Lỗi từ service của chúng ta
  switch (err.code) {
    case "LOCK_ACQUIRE_FAILED":
      customError = new AppError(
        "The resource is busy, please try again later.",
        409, // Conflict
        error_code.RESOURCE_CONFLICT
      );
      break;
    case "NOT_FOUND":
      customError = new AppError(
        err.message, // "Contributor with ID ... not found"
        404, // Not Found
        error_code.NOT_FOUND
      );
      break;
    // Thêm các case cho các mã lỗi khác ở đây...
  }

  // Nếu sau khi kiểm tra, lỗi vẫn là lỗi thô (chưa được xử lý ở trên)
  // thì nó là lỗi 500 Internal Server Error
  if (!(customError instanceof AppError)) {
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
      statusCode: 500,
      errorCode: error_code.INTERNAL_ERROR,
    });
  }

  // Gửi đi lỗi đã được chuyển đổi
  return res.status(customError.statusCode).json({
    success: false,
    message: customError.message,
    errorCode: customError.errorCode,
    statusCode: customError.statusCode,
    errors: customError.errors,
  });
};
