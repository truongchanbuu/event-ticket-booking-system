import { body, query } from "express-validator";
import {
    BaseValidator,
    EnumHelper,
    ROLE,
} from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user_status.enum.js";

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
                .isIn(["admin", "user", "organizer"])
                .withMessage("Role must be one of: admin, user, organizer"),

            query("status")
                .optional()
                .isString()
                .isIn(["active", "inactive", "banned"])
                .withMessage("Status must be one of: active, inactive, banned"),

            query("sortBy")
                .optional()
                .isIn(["createdAt", "firstName", "lastName", "email"])
                .withMessage(
                    "SortBy must be one of: createdAt, firstName, lastName, email",
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

    /**
     * Validate register user
     */
    static validateRegister() {
        return [
            body("email")
                .trim()
                .isEmail()
                .withMessage("Invalid email")
                .normalizeEmail(),

            // Username validation
            body("username")
                .trim()
                .isLength({ min: 2, max: 30 })
                .withMessage("Username must have at least 2-30 characters"),

            // Phone number validation
            body("phoneNumber")
                .optional()
                .matches(/^(\+84|0)[3|5|7|8|9]\d{8}$/)
                .withMessage("Invalid phone number"),

            // Role validation
            body("role")
                .optional()
                .isIn(ROLE)
                .withMessage(
                    `Role must include on: ${EnumHelper.enumToString(ROLE)}`,
                )
                .default(ROLE.CUSTOMER),

            // Birth date validation
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

            // Preference categories validation
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

            // Followed organizers validation
            body("followedOrganizers")
                .optional()
                .isArray()
                .withMessage("Following organizers must be an array"),

            // Notification reference validation
            body("notificationReferences")
                .optional()
                .isArray()
                .withMessage("Notification list must be an array"),

            // Status validation
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
