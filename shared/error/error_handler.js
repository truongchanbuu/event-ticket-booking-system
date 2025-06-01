import AppError from "./app_error.js";
import error_code from "./error_code.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errorCode: error_code.INTERNAL_ERROR,
  });
};
