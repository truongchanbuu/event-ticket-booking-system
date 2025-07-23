import { validationResult, param, body } from "express-validator";
import ERROR_CODE from "../error/error_code.js";
import AppError from "../error/app_error.js";

const MIN_AGE = 16;
const MAX_AGE = 100;

export default class BaseValidator {
  //======================================================================
  //== RULE OBJECT HELPERS (For checkSchema)
  //======================================================================
  // Các phương thức này trả về ĐỐI TƯỢNG QUY TẮC để checkSchema sử dụng.

  static emailValidationRules() {
    return {
      isString: true,
      trim: true,
      isEmail: { errorMessage: "Invalid email" },
      normalizeEmail: true,
    };
  }

  static nameValidationRules() {
    return {
      isString: true,
      notEmpty: true,
      isLength: {
        options: { min: 2, max: 30 },
        errorMessage: "Username must have at least 2-30 characters",
      },
    };
  }

  static phoneNumberValidationRules(locale = "vi-VN") {
    return {
      matches: { options: [/^(\+84|0)[3|5|7|8|9]\d{8}$/] },
      isMobilePhone: {
        options: [locale],
        errorMessage: "Invalid phone number",
      },
    };
  }

  static urlValidationRules(patterns = []) {
    const rules = {
      isString: true,
      trim: true,
      isURL: { errorMessage: "Must be a valid URL" },
    };
    if (patterns.length > 0) {
      rules.custom = {
        options: (value) => patterns.some((pattern) => value.includes(pattern)),
        errorMessage: `URL must be one of: ${patterns.join(", ")}`,
      };
    }
    return rules;
  }

  static birthdayValidationRules(minAge = MIN_AGE, maxAge = MAX_AGE) {
    return {
      isISO8601: { errorMessage: "Invalid birthday format" },
      custom: {
        options: (value) => {
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
        },
      },
    };
  }

  //======================================================================
  //== VALIDATION CHAIN HELPERS (For standard validation arrays)
  //======================================================================
  // Các phương thức này trả về MẢNG CHUỖI VALIDATOR, vẫn hữu ích cho nhiều trường hợp.

  static validateEmail({ fieldName = "email", optional = false } = {}) {
    const chain = body(fieldName)
      .trim()
      .isEmail()
      .withMessage("Invalid email")
      .normalizeEmail();
    return optional
      ? [chain.optional()]
      : [body(fieldName).notEmpty().withMessage("Email is required"), chain];
  }

  static validateName({ fieldName = "username", optional = false } = {}) {
    const chain = body(fieldName)
      .isString()
      .notEmpty()
      .isLength({ min: 2, max: 30 })
      .withMessage(`Username must have at least 2-30 characters`);
    return optional
      ? [chain.optional()]
      : [
          body(fieldName).notEmpty().withMessage(`${fieldName} is required`),
          chain,
        ];
  }

  static validatePhoneNumber({
    fieldName = "phoneNumber",
    optional = true,
    locale = "vi-VN",
  } = {}) {
    const chain = body(fieldName)
      .matches(/^(\+84|0)[3|5|7|8|9]\d{8}$/)
      .isMobilePhone(locale)
      .withMessage("Invalid phone number");
    return optional ? [chain.optional()] : [chain];
  }

  static validateURL({
    fieldName,
    optional = true,
    patterns = [],
    label = null,
  } = {}) {
    const fieldLabel = label || fieldName;
    let chain = body(fieldName)
      .isString()
      .trim()
      .isURL()
      .withMessage(`${fieldLabel} must be a valid URL`)
      .bail()
      .custom((value) => {
        if (patterns.length > 0 && !patterns.some((p) => value.includes(p))) {
          throw new Error(
            `${fieldLabel} must be one of: ${patterns.join(", ")}`
          );
        }
        return true;
      });
    return optional
      ? [chain.optional()]
      : [
          body(fieldName).notEmpty().withMessage(`${fieldLabel} is required`),
          chain,
        ];
  }

  static validateBirthday({
    field = "birthday",
    optional = true,
    minAge = MIN_AGE,
    maxAge = MAX_AGE,
  } = {}) {
    const chain = body(field)
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
      });
    return optional ? [chain.optional()] : [chain];
  }

  static validateIDParam({ paramName = "id", label = "ID" } = {}) {
    return [
      param(paramName)
        .exists()
        .withMessage(`${label} is required`)
        .isString()
        .trim()
        .notEmpty()
        .withMessage(`${label} cannot be empty`),
    ];
  }

  static validateIDBody({ fieldName = "id", label = "ID" } = {}) {
    return [
      body(fieldName)
        .exists()
        .withMessage(`${label} is required`)
        .isString()
        .trim()
        .notEmpty()
        .withMessage(`${label} cannot be empty`),
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
          err.path !== "confirmPassword" && { value: err.value }),
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
