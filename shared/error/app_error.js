import ERROR_CODE from "./error_code.js";

export default class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    errorCode = ERROR_CODE.INTERNAL_ERROR
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}
