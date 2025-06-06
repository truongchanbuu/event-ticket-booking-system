import { validationResult } from "express-validator";
import ERROR_CODE from "../error/error_code.js";

export default class BaseValidator {
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formatted = errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      }));

      throw new AppError({
        message: "Invalid Data",
        statusCode: 400,
        errorCode: ERROR_CODE.INVALID_DATA,
        errors: formatted,
      });
    }

    next();
  }
}
