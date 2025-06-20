import { validationResult } from "express-validator";
import ERROR_CODE from "../error/error_code.js";
import AppError from "../error/app_error.js";

export default class BaseValidator {
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formatted = errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        location: err.location,
        ...(err.path !== "password" &&
          err.path !== "confirmPassword" && {
            value: err.value,
          }),
      }));

      return next(
        new AppError({
          message: "Validation Failed",
          statusCode: 400,
          errorCode: ERROR_CODE.INVALID_DATA,
          errors: formatted,
        })
      );
    }

    next();
  }
}
