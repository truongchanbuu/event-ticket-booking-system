import { body, param } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";

export default class AuthValidator extends BaseValidator {
    /**
     * Validate token revocation input
     */
    static validateRevokeToken() {
        return [
            body("uid")
                .notEmpty()
                .withMessage("User ID is required")
                .isString()
                .withMessage("User ID must be a string"),

            body("reason")
                .optional()
                .isString()
                .withMessage("Reason must be a string"),
        ];
    }

    /**
     * Validate claims update
     */
    static validateSetClaims() {
        return [
            param("uid")
                .notEmpty()
                .withMessage("User ID is required in path parameter"),

            body("claims")
                .notEmpty()
                .withMessage("Claims object is required")
                .isObject()
                .withMessage("Claims must be a valid object"),

            body("merge")
                .optional()
                .isBoolean()
                .withMessage("Merge flag must be a boolean"),
        ];
    }

    /**
     * Validate user ID param for get claims
     */
    static validateGetClaims() {
        return [
            param("uid")
                .notEmpty()
                .withMessage("User ID is required")
                .isString()
                .withMessage("User ID must be a string"),
        ];
    }
}
