import ERROR_CODE from "./error_code.js";

export default class AppError extends Error {
  constructor({
    message = "There is something went wrong",
    statusCode = 500,
    errorCode = ERROR_CODE.INTERNAL_ERROR,
    errors = [],
  }) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}
