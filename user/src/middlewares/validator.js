import { body, param, query } from "express-validator";
import {
    APPLY_STATUS,
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
    "usernameLowerCase",
    "email",
    "phoneNumber",
    "birthday",
    "orgName",
    "status",
    "applyType",
    "rejectCount",
    "lastRejectedAt",
];
const SORT_ORDER = ["asc", "desc"];

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

            query("isDeleted").optional(),

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
                    if (value === "username") return "usernameLowerCase";
                    return value;
                })
                .isIn(ALLOWED_SORT_FIELDS)
                .withMessage(
                    `sortBy must be one of: username, ${ALLOWED_SORT_FIELDS.join(", ")}`,
                ),

            query("sortOrder")
                .optional()
                .isIn(SORT_ORDER)
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
            ...this.validateEmail(),
            ...this.validateName(),
            ...this._sharedUserValidationRules(),
        ];
    }

    static validateUpdateUser() {
        return [
            ...this.validateIDParam({ paramName: "userID" }),
            ...this.validateEmail(),
            ...this.validateName(),
            ...this._sharedUserValidationRules(),
        ];
    }

    static validateFollowedOrganizer() {
        return [
            ...this.validateIDParam({ paramName: "userID" }),
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
            ...this.validateIDBody({
                fieldName: "followedOrganizers.*.orgID",
            }),
            ...this.validateName({
                fieldName: "followedOrganizers.*.orgName",
            }),
            ...this.validateURL({
                fieldName: "followedOrganizers.*.orgAvatar",
            }),
        ];
    }

    static validateNotification() {
        return [
            ...this.validateIDParam(),
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
            ...this.validateIDBody({
                fieldName: "notificationReferences.*.notificationID",
            }),
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
            ...this.validateIDParam({ paramName: "userID" }),
            ...this.validateIDParam({ paramName: "notificationID" }),

            body("status")
                .isIn(Object.values(NOTIFICATION_STATUS))
                .withMessage(
                    `Invalid status. Allowed values: ${EnumHelper.enumToString(NOTIFICATION_STATUS)}`,
                ),
            ,
        ];
    }

    static validateDeleteUser() {
        return [
            ...this.validateIDParam({ paramName: "userID" }),
            query("force")
                .isBoolean()
                .withMessage("force must be boolean")
                .default(false),
        ];
    }

    static validateGetOrganizerDetail() {
        return this.validateUserIDParam();
    }

    static validateEventOrgApplication() {
        return [
            body("applyType")
                .notEmpty()
                .withMessage("Apply type is required")
                .custom((val) => {
                    if (typeof val === "string") val = [val];
                    if (!Array.isArray(val))
                        throw new Error("Apply type must be array or string");

                    const allowed = ["individual", "business"];
                    for (const type of val) {
                        if (!allowed.includes(type)) {
                            throw new Error("Invalid apply type");
                        }
                    }
                    return true;
                }),

            // Common fields
            ...this.validateName({ fieldName: "orgName" }),
            body("description")
                .notEmpty()
                .withMessage("Organization description is required")
                .isLength({ min: 10, max: 1000 })
                .withMessage(
                    "Description must be between 10 and 1000 characters",
                ),

            // INDIVIDUAL applyType
            body("kycInfo.fullName")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .notEmpty()
                .withMessage("Full name is required"),

            body("kycInfo.idNumber")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .notEmpty()
                .withMessage("ID number is required"),

            body("kycInfo.dob")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .isISO8601()
                .withMessage("Invalid date of birth"),

            body("kycInfo.idIssueDate")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .isISO8601()
                .withMessage("Invalid ID issue date"),

            body("kycInfo.idIssuedBy")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .notEmpty()
                .withMessage("ID issued by is required"),

            body("kycInfo.idFrontImageUrl")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .isURL()
                .withMessage("Invalid front ID image URL"),

            body("kycInfo.idBackImageUrl")
                .if((_, { req }) => req.body.applyType?.includes("individual"))
                .isURL()
                .withMessage("Invalid back ID image URL"),

            // BUSINESS applyType
            body("kycInfo.businessName")
                .if((_, { req }) => req.body.applyType?.includes("business"))
                .notEmpty()
                .withMessage("Business name is required"),

            body("kycInfo.registrationNumber")
                .if((_, { req }) => req.body.applyType?.includes("business"))
                .notEmpty()
                .withMessage("Business registration number is required"),

            body("kycInfo.issueDate")
                .if((_, { req }) => req.body.applyType?.includes("business"))
                .isISO8601()
                .withMessage("Invalid business license issue date"),

            body("kycInfo.issuedBy")
                .if((_, { req }) => req.body.applyType?.includes("business"))
                .notEmpty()
                .withMessage("Business license issued by is required"),

            body("kycInfo.businessType")
                .if((_, { req }) => req.body.applyType?.includes("business"))
                .notEmpty()
                .withMessage("Business type is required"),

            body("kycInfo.businessLicenseUrl")
                .if((_, { req }) => req.body.applyType?.includes("business"))
                .isURL()
                .withMessage("Invalid business license URL"),

            // Optional common info
            ...this.validateURL({
                fieldName: "optionalInfo.websiteUrl",
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.facebookUrl",
                patterns: ["facebook.com"],
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.instagramUrl",
                patterns: ["instagram.com"],
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.tiktokUrl",
                patterns: ["tiktok.com"],
            }),

            ...this.validatePhoneNumber(),
            ...this.validateEmail({ fieldName: "optionalInfo.email" }),
        ];
    }

    static validateGetAllApplications() {
        return [
            query("limit")
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage("Limit must be between 1 and 100"),

            // Search validation
            query("search")
                .optional()
                .isString()
                .notEmpty()
                .isLength({ min: 2, max: 100 })
                .withMessage(
                    "Search must be a string between 1 and 100 characters",
                )
                .trim(),

            // Status validation
            query("status")
                .optional()
                .isString()
                .isIn(Object.values(APPLY_STATUS))
                .withMessage(
                    `Status must be one of: ${EnumHelper.enumToString(APPLY_STATUS)}`,
                ),

            // Application type validation
            query("applyType")
                .optional()
                .isString()
                .isIn(Object.values(APPLY_STATUS))
                .withMessage(
                    `ApplyType must be one of: ${EnumHelper.enumToString(APPLY_STATUS)}`,
                ),

            // Sort field validation with custom sanitizer
            query("sortBy")
                .optional()
                .customSanitizer((value) => {
                    if (!value) return "createdAt";
                    if (value === "orgName") return "orgName_lowercase";
                    return value;
                })
                .isIn([...ALLOWED_SORT_FIELDS, "orgName_lowercase"])
                .withMessage(
                    `sortBy must be one of: ${ALLOWED_SORT_FIELDS.join(", ")}`,
                ),

            // Sort order validation
            query("sortOrder")
                .optional()
                .isIn(SORT_ORDER)
                .withMessage("sortOrder must be either asc or desc"),

            // Date range validation - from date
            query("dateFrom")
                .optional()
                .isISO8601()
                .withMessage("dateFrom must be a valid ISO8601 date")
                .toDate(),

            // Date range validation - to date
            query("dateTo")
                .optional()
                .isISO8601()
                .withMessage("dateTo must be a valid ISO8601 date")
                .toDate()
                .custom((dateTo, { req }) => {
                    if (
                        req.query.dateFrom &&
                        dateTo < new Date(req.query.dateFrom)
                    ) {
                        throw new Error("dateTo must be after dateFrom");
                    }
                    return true;
                }),

            // Pagination validation - last visible value
            query("lastVisibleValue")
                .optional()
                .custom((value, { req }) => {
                    const sortBy = req.query.sortBy || "createdAt";

                    // For timestamp fields
                    if (
                        ["createdAt", "updatedAt", "lastRejectedAt"].includes(
                            sortBy,
                        )
                    ) {
                        const timestamp = Number(value);
                        if (isNaN(timestamp)) {
                            throw new Error(
                                `lastVisibleValue must be a timestamp when sortBy is ${sortBy}`,
                            );
                        }
                    }
                    // For numeric fields
                    else if (sortBy === "rejectCount") {
                        const number = Number(value);
                        if (isNaN(number) || number < 0) {
                            throw new Error(
                                "lastVisibleValue must be a non-negative number when sortBy is rejectCount",
                            );
                        }
                    }
                    // For string fields
                    else {
                        if (typeof value !== "string" || value.length === 0) {
                            throw new Error(
                                `lastVisibleValue must be a non-empty string when sortBy is ${sortBy}`,
                            );
                        }
                    }
                    return true;
                }),

            // User ID validation (for filtering by specific user)
            query("userID")
                .optional()
                .isString()
                .isLength({ min: 1, max: 50 })
                .withMessage(
                    "userID must be a string between 1 and 50 characters",
                )
                .trim(),

            // Admin review filter
            query("requiresAdminApproval")
                .optional()
                .isBoolean()
                .withMessage("requiresAdminApproval must be a boolean"),

            // Cooldown filter
            query("hasCooldown")
                .optional()
                .isBoolean()
                .withMessage("hasCooldown must be a boolean"),

            // Reject count range
            query("minRejectCount")
                .optional()
                .isInt({ min: 1 })
                .withMessage("minRejectCount must be greater than 0"),

            query("maxRejectCount")
                .optional()
                .isInt({ min: 0 })
                .withMessage("maxRejectCount must be a non-negative integer")
                .custom((value, { req }) => {
                    const minRejectCount = parseInt(req.query.minRejectCount);
                    if (minRejectCount && value < minRejectCount) {
                        throw new Error(
                            "maxRejectCount must be greater than or equal to minRejectCount",
                        );
                    }
                    return true;
                }),
        ];
    }

    static validateGetApplicationByID() {
        return this.validateIDParam({ paramName: "applicationID" });
    }

    static validateUpdateApplication() {
        return [
            ...this.validateIDParam({ paramName: "applicationID" }),

            // ORG INFO
            body("orgName")
                .optional()
                .isString()
                .trim()
                .notEmpty()
                .withMessage("Organization name must not be empty"),

            body("description")
                .optional()
                .isString()
                .trim()
                .isLength({ min: 10, max: 1000 })
                .withMessage(
                    "Description must be between 10 and 1000 characters",
                ),

            // KYC - INDIVIDUAL
            body("kycInfo.individual.fullName")
                .optional()
                .isString()
                .trim()
                .notEmpty()
                .withMessage("Full name must not be empty"),

            body("kycInfo.individual.idNumber")
                .optional()
                .isString()
                .trim()
                .matches(/^\d{9,12}$/)
                .withMessage("ID number must be 9-12 digits"),

            body("kycInfo.individual.dob")
                .optional()
                .isISO8601()
                .withMessage("Invalid date of birth")
                .custom(this.validateBirthday()),

            body("kycInfo.individual.idIssueDate")
                .optional()
                .isISO8601()
                .withMessage("Invalid issue date"),

            body("kycInfo.individual.idIssuedBy")
                .optional()
                .isString()
                .trim()
                .notEmpty()
                .withMessage("ID issued by must not be empty"),

            body("kycInfo.individual.idFrontImageUrl")
                .optional()
                .isURL()
                .withMessage("Invalid front ID image URL"),

            body("kycInfo.individual.idBackImageUrl")
                .optional()
                .isURL()
                .withMessage("Invalid back ID image URL"),

            // KYC - BUSINESS
            body("kycInfo.business.businessName")
                .optional()
                .isString()
                .notEmpty()
                .withMessage("Business name must not be empty"),

            body("kycInfo.business.registrationNumber")
                .optional()
                .isString()
                .notEmpty()
                .withMessage("Business registration number is required"),

            body("kycInfo.business.issueDate")
                .optional()
                .isISO8601()
                .withMessage("Invalid business license issue date"),

            body("kycInfo.business.issuedBy")
                .optional()
                .isString()
                .notEmpty()
                .withMessage("Business license issued by is required"),

            body("kycInfo.business.businessType")
                .optional()
                .isString()
                .notEmpty()
                .withMessage("Business type is required"),

            body("kycInfo.business.businessLicenseUrl")
                .optional()
                .isURL()
                .withMessage("Invalid business license URL"),

            // OPTIONAL URLS
            ...this.validateURL({
                fieldName: "optionalInfo.websiteUrl",
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.facebookUrl",
                patterns: ["facebook.com"],
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.instagramUrl",
                patterns: ["instagram.com"],
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.tiktokUrl",
                patterns: ["tiktok.com"],
            }),

            // RESTRICTED FIELDS (system managed)
            body([
                "status",
                "rejectionReason",
                "requiresAdminApproval",
                "rejectCount",
                "lastRejectedAt",
                "cooldownUntil",
                "createdAt",
                "updatedAt",
                "reviewedBy",
                "reviewedAt",
            ])
                .not()
                .exists()
                .withMessage("You cannot update restricted fields"),
        ];
    }

    static validateDeleteApplication() {
        return [
            ...this.validateIDParam("applicationID"),
            query("force")
                .optional()
                .isBoolean()
                .withMessage("Force must be boolean"),
            body("reason").optional().isString().notEmpty(),
        ];
    }

    static validateApproveApplication() {
        return [
            ...this.validateIDParam({ paramName: "applicationID" }),

            // Validate body
            body("status")
                .isIn(["approved", "rejected"])
                .withMessage("Status must be either 'approved' or 'rejected'"),

            body("reviewedBy")
                .optional()
                .isString()
                .withMessage("reviewedBy must be a string"),

            // Validate rejectionReason: only required when status === 'rejected'
            body("rejectionReason")
                .if(body("status").equals("rejected"))
                .isString()
                .notEmpty()
                .withMessage(
                    "Rejection reason is required when status is 'rejected'",
                ),
        ];
    }

    static _sharedUserValidationRules() {
        return [
            ...this.validatePhoneNumber(),
            body("role")
                .optional()
                .isIn(ROLE)
                .withMessage(
                    `Role must include on: ${EnumHelper.enumToString(ROLE)}`,
                )
                .default(ROLE.CUSTOMER),
            ...this.validateBirthday(),

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

            ...this.validateURL({ fieldName: "photoUrl" }),
        ];
    }
}
