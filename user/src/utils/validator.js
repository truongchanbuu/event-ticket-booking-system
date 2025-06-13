import { body, param, query } from "express-validator";
import {
    BaseValidator,
    EnumHelper,
    NOTIFICATION_REF,
    NOTIFICATION_STATUS,
    ROLE,
} from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user_status.enum.js";

const FOLLOW_ACTION_ENUM = ["follow", "unfollow"];
const NOTIFICATION_ACTION_ENUM = ["create", "delete", "update"];
const ALLOWED_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "username_lowercase",
    "email",
    "phoneNumber",
    "birthday",
];
export default class UserValidator extends BaseValidator {
    /**
     * Validate get users API
     */
    static validateGetUsers() {
        return [
            query("limit")
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage("Limit must be between 1 and 100"),

            query("search")
                .optional()
                .isString()
                .withMessage("Search must be a string"),

            query("role")
                .optional()
                .isString()
                .isIn(Object.values(ROLE))
                .withMessage(
                    `Role must be one of: ${EnumHelper.enumToString(ROLE)}`,
                ),

            query("sortBy")
                .optional()
                .customSanitizer((value) => {
                    if (!value) return "createdAt";
                    if (value === "username") return "username_lowercase";
                    return value;
                })
                .isIn(ALLOWED_SORT_FIELDS)
                .withMessage(
                    `sortBy must be one of: username, ${ALLOWED_SORT_FIELDS.join(", ")}`,
                ),

            query("sortOrder")
                .optional()
                .isIn(["asc", "desc"])
                .withMessage("SortOrder must be either asc or desc"),

            query("lastVisibleValue")
                .optional()
                .custom((value, { req }) => {
                    const sortBy = req.query.sortBy || "createdAt";

                    if (sortBy === "createdAt") {
                        const timestamp = Number(value);
                        if (isNaN(timestamp)) {
                            throw new Error(
                                "lastVisibleValue must be a timestamp when sortBy is createdAt",
                            );
                        }
                    } else {
                        if (typeof value !== "string" || value.length === 0) {
                            throw new Error(
                                `lastVisibleValue must be a non-empty string when sortBy is ${sortBy}`,
                            );
                        }
                    }
                    return true;
                }),
        ];
    }

    static validateCreateUser() {
        return [
            body("email")
                .trim()
                .notEmpty()
                .withMessage("Email is required")
                .isEmail()
                .withMessage("Invalid email")
                .normalizeEmail(),

            body("username")
                .trim()
                .notEmpty()
                .withMessage("Username is required")
                .isLength({ min: 2, max: 30 })
                .withMessage("Username must have at least 2-30 characters"),

            ...this._sharedUserValidationRules(),
        ];
    }

    static validateUpdateUser() {
        return [
            this._validateUserIDParam(),

            body("email")
                .optional()
                .isEmail()
                .withMessage("Invalid email")
                .normalizeEmail(),

            body("username")
                .optional()
                .isLength({ min: 2, max: 30 })
                .withMessage("Username must have at least 2-30 characters"),

            ...this._sharedUserValidationRules(),
        ];
    }

    static validateFollowedOrganizer() {
        return [
            this._validateUserIDParam(),

            body("action")
                .exists()
                .withMessage("Action is required")
                .isString()
                .withMessage("Action must be a string")
                .isIn(FOLLOW_ACTION_ENUM)
                .withMessage(
                    `Action must be one of: ${FOLLOW_ACTION_ENUM.join(", ")}`,
                ),

            body("followedOrganizers")
                .isArray({ min: 1 })
                .withMessage("Following organizers must be an array"),

            body("followedOrganizers.*.orgID")
                .notEmpty()
                .withMessage("Each followed organizer must have an orgID"),

            body("followedOrganizers.*.orgName")
                .notEmpty()
                .withMessage("Each followed organizer must have a name"),

            body("followedOrganizers.*.orgAvatar")
                .optional()
                .isURL()
                .withMessage("Avatar must be a valid URL if provided"),
        ];
    }

    static validateNotification() {
        return [
            this._validateUserIDParam(),

            body("action")
                .exists()
                .withMessage("Action is required")
                .isIn(NOTIFICATION_ACTION_ENUM)
                .withMessage(
                    `Action must be one of ${NOTIFICATION_ACTION_ENUM.join(", ")}`,
                ),
            body("notificationReferences")
                .isArray({ min: 1 })
                .withMessage("Notification list must be an array"),

            body("notificationReferences.*.notificationID")
                .exists()
                .withMessage("Each reference must have a notificationID")
                .isString()
                .withMessage("notificationID must be a string"),

            body("notificationReferences.*.notificationRef")
                .exists()
                .withMessage("Each reference must have a notificationRef")
                .isIn(Object.values(NOTIFICATION_REF))
                .withMessage(
                    `notificationRef must be one of: ${EnumHelper.enumToString(NOTIFICATION_REF)}`,
                ),

            body("notificationReferences.*.title")
                .optional()
                .isString()
                .withMessage("Title must be a string"),

            body("notificationReferences.*.desc")
                .optional()
                .isString()
                .withMessage("Description must be a string"),
        ];
    }

    static validateUpdateNotificationStatus() {
        return [
            this._validateUserIDParam(),

            param("notificationID")
                .exists()
                .isString()
                .notEmpty()
                .withMessage("Notification ID is required"),

            body("status")
                .isIn(Object.values(NOTIFICATION_STATUS))
                .withMessage(
                    `Invalid status. Allowed values: ${EnumHelper.enumToString(NOTIFICATION_STATUS)}`,
                ),
            ,
        ];
    }

    static validateDeleteUser() {
        return [this._validateUserIDParam()];
    }

    static _validateUserIDParam() {
        return param("userID")
            .exists()
            .isString()
            .notEmpty()
            .withMessage("User ID is required");
    }

    static _sharedUserValidationRules() {
        return [
            body("phoneNumber")
                .optional()
                .matches(/^(\+84|0)[3|5|7|8|9]\d{8}$/)
                .withMessage("Invalid phone number"),

            body("role")
                .optional()
                .isIn(ROLE)
                .withMessage(
                    `Role must include on: ${EnumHelper.enumToString(ROLE)}`,
                )
                .default(ROLE.CUSTOMER),

            body("birthday")
                .optional()
                .isISO8601()
                .withMessage("Invalid birthday")
                .custom((value) => {
                    const birthday = new Date(value);
                    const now = new Date();
                    const MIN_AGE = 16;
                    const MAX_AGE = 100;
                    const minDate = new Date(
                        now.getFullYear() - MAX_AGE,
                        now.getMonth(),
                        now.getDate(),
                    );
                    const maxDate = new Date(
                        now.getFullYear() - MIN_AGE,
                        now.getMonth(),
                        now.getDate(),
                    );

                    if (birthday < minDate || birthday > maxDate) {
                        throw new Error(
                            "Invalid birthday. Age must be within 16-100",
                        );
                    }
                    return true;
                }),

            body("preferenceCategories")
                .optional()
                .isArray()
                .withMessage("Preference Category is an array")
                .custom((categories) => {
                    if (categories && categories.length > 0) {
                        const allStrings = categories.every(
                            (cat) => typeof cat === "string",
                        );
                        if (!allStrings) {
                            throw new Error("All Category must be a string");
                        }
                    }
                    return true;
                }),

            body("status")
                .optional()
                .isIn(USER_STATUS)
                .withMessage(
                    `Status must be one of: ${EnumHelper.enumToString(USER_STATUS)}`,
                )
                .default(USER_STATUS.PENDING),
        ];
    }
}
