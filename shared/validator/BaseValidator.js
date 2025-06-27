import { validationResult } from "express-validator";
import ERROR_CODE from "../error/error_code.js";
import AppError from "../error/app_error.js";

export default class BaseValidator {
  // Common
  static validateEmail({ fieldName = "email", required = true }) {
    const chain = body(fieldName)
      .isString()
      .trim()
      .isEmail()
      .withMessage("Invalid email")
      .normalizeEmail();
    return required
      ? [body(fieldName).notEmpty().withMessage("Email is required"), chain]
      : [chain.optional()];
  }

  static validateName({ fieldName = "username", required = true }) {
    const chain = body(fieldName)
      .isString()
      .notEmpty()
      .isLength({ min: 2, max: 30 })
      .withMessage(`Username must have at least 2-30 characters`);
    return required
      ? [
          body("username").notEmpty().withMessage(`${fieldName} is required`),
          chain,
        ]
      : [chain.optional()];
  }

  static validatePhoneNumber({
    fieldName = "phoneNumber",
    optional = true,
    locale = "vi-VN",
  }) {
    const chain = body(fieldName)
      .matches(/^(\+84|0)[3|5|7|8|9]\d{8}$/)
      .isMobilePhone(locale)
      .withMessage("Invalid phone number");
    return optional ? [chain.optional()] : [chain];
  }

  static validateURL({
    fieldName,
    required = false,
    patterns = [], // e.g., ["facebook.com", "instagram.com"]
    label = null, // optional custom label for messages
  }) {
    const fieldLabel = label || fieldName;

    let chain = body(fieldName)
      .isString()
      .trim()
      .isURL()
      .withMessage(`${fieldLabel} must be a valid URL`)
      .bail() // nếu sai URL thì không kiểm tra tiếp
      .custom((value) => {
        if (patterns.length > 0) {
          const matched = patterns.some((pattern) => value.includes(pattern));
          if (!matched) {
            throw new Error(
              `${fieldLabel} must be one of: ${patterns.join(", ")}`
            );
          }
        }
        return true;
      });

    if (required) {
      return [
        body(fieldName).notEmpty().withMessage(`${fieldLabel} is required`),
        chain,
      ];
    } else {
      return [chain.optional()];
    }
  }

  static validateISODate({ fieldName, required = false }) {
    const chain = body(fieldName)
      .isISO8601()
      .withMessage(`${fieldName} must be a valid ISO 8601 date`);
    return required
      ? [
          body(fieldName).notEmpty().withMessage(`${fieldName} is required`),
          chain,
        ]
      : [chain.optional()];
  }

  static validateIDParam({ paramName = "id", label = "ID" }) {
    return [
      param(paramName)
        .exists()
        .withMessage(`${label} is required`)
        .isString()
        .trim()
        .withMessage(`${label} must be a string`)
        .notEmpty()
        .withMessage(`${label} cannot be empty`),
    ];
  }

  static validateIDBody({ fieldName = "id", label = "ID" }) {
    return [
      body(fieldName)
        .exists()
        .withMessage(`${label} is required`)
        .isString()
        .trim()
        .withMessage(`${label} must be a string`)
        .notEmpty()
        .withMessage(`${label} cannot be empty`),
    ];
  }

  static validateBirthday({ field = "birthday", minAge = 16, maxAge = 100 }) {
    return [
      body(field)
        .optional()
        .isISO8601()
        .withMessage("Invalid birthday")
        .custom((value) => {
          const birthday = new Date(value);
          const now = new Date();

          const minDate = new Date(
            now.getFullYear() - maxAge,
            now.getMonth(),
            now.getDate()
          );
          const maxDate = new Date(
            now.getFullYear() - minAge,
            now.getMonth(),
            now.getDate()
          );

          if (birthday < minDate || birthday > maxDate) {
            throw new Error(
              `Invalid birthday. Age must be within ${minAge}-${maxAge}`
            );
          }
          return true;
        }),
    ];
  }

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
