import { body, param, query } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";

export default class UserValidator extends BaseValidator {
    /**
     * Validate get users API
     */
    static validateGetUsers() {
        return [
            query("page")
                .optional()
                .isInt({ min: 1 })
                .withMessage("Page must be an integer >= 1"),

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

            query("organizerStatus")
                .optional()
                .isString()
                .isIn(["approved", "pending", "rejected"])
                .withMessage(
                    "Organizer status must be one of: approved, pending, rejected",
                ),

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
        ];
    }
}
