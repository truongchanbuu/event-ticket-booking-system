import { body, checkSchema, query } from "express-validator";
import {
    APPLY_STATUS,
    BaseValidator,
    EnumHelper,
    NOTIFICATION_REF,
    NOTIFICATION_STATUS,
    ROLE,
} from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user-status.enum.js";

// --- Constants ---
const FOLLOW_ACTION_ENUM = ["follow", "unfollow"];
const NOTIFICATION_ACTION_ENUM = ["create", "delete", "update"];
const ALLOWED_USER_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "usernameLowerCase",
    "email",
    "phoneNumber",
    "birthday",
];
const ALLOWED_APP_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "orgName_lowercase",
    "status",
    "applyType",
    "rejectCount",
    "lastRejectedAt",
];
const SORT_ORDER = ["asc", "desc"];
const SYSTEM_FIELDS = [
    "userID",
    "role",
    "status",
    "organizerStatus",
    "riskScore",
    "reportCount",
    "followedOrganizers",
    "notificationReferences",
    "createdAt",
    "updatedAt",
    "emailVerified",
    "phoneNumberVerified",
    "provider",
];

export default class UserValidator extends BaseValidator {
    /**
     * Endpoint xác thực cho người dùng tự cập nhật hồ sơ của mình.
     * Sử dụng checkSchema để thực thi "allowlist" và kiểm tra quyền trên từng trường.
     */
    static validateSelfUpdate() {
        const checkRole = (value, { req }, role, fieldName) => {
            if (req.user?.role !== role) {
                throw new Error(
                    `You do not have permission to set the '${fieldName}' field.`,
                );
            }
            return true;
        };

        return checkSchema(
            {
                // --- Common Fields (Sử dụng các ...Rules() helpers từ BaseValidator) ---
                email: { ...this.emailValidationRules(), optional: true },
                username: { ...this.nameValidationRules(), optional: true },
                phoneNumber: {
                    ...this.phoneNumberValidationRules(),
                    optional: true,
                },
                birthday: { ...this.birthdayValidationRules(), optional: true },
                photoUrl: { ...this.urlValidationRules(), optional: true },
                preferenceCategories: {
                    optional: true,
                    isArray: {
                        options: { max: 50 },
                        errorMessage:
                            "preferenceCategories must be an array with a max of 50 items.",
                    },
                },
                "preferenceCategories.*": {
                    isString: true,
                    trim: true,
                    notEmpty: true,
                    errorMessage: "Each category must be a non-empty string.",
                },

                // --- Organizer-Only Fields (Sử dụng custom validator để check role) ---
                websiteUrl: {
                    optional: true,
                    ...this.urlValidationRules(),
                    custom: {
                        options: (v, meta) =>
                            checkRole(v, meta, ROLE.ORGANIZER, "websiteUrl"),
                    },
                },
                facebookUrl: {
                    optional: true,
                    ...this.urlValidationRules(["facebook.com"]),
                    custom: {
                        options: (v, meta) =>
                            checkRole(v, meta, ROLE.ORGANIZER, "facebookUrl"),
                    },
                },
                instagramUrl: {
                    optional: true,
                    ...this.urlValidationRules(["instagram.com"]),
                    custom: {
                        options: (v, meta) =>
                            checkRole(v, meta, ROLE.ORGANIZER, "instagramUrl"),
                    },
                },
                xUrl: {
                    optional: true,
                    ...this.urlValidationRules(["x.com", "twitter.com"]),
                    custom: {
                        options: (v, meta) =>
                            checkRole(v, meta, ROLE.ORGANIZER, "xUrl"),
                    },
                },
                bio: {
                    optional: true,
                    isString: true,
                    isLength: {
                        options: { max: 1000 },
                        errorMessage: "Bio must be a string up to 1000 chars",
                    },
                    custom: {
                        options: (v, meta) =>
                            checkRole(v, meta, ROLE.ORGANIZER, "bio"),
                    },
                },
                organizerType: {
                    optional: true,
                    isIn: {
                        options: [["personal", "business"]],
                        errorMessage:
                            "organizerType must be 'personal' or 'business'",
                    },
                    custom: {
                        options: (v, meta) =>
                            checkRole(v, meta, ROLE.ORGANIZER, "organizerType"),
                    },
                },
            },
            ["body"],
        );
    }

    /**
     * Validates user deletion.
     * Checks for a valid userID in the URL parameters and an optional 'force' boolean in the query string.
     */
    static validateDeleteUser() {
        return [
            // 1. Validate that the 'userID' parameter in the URL is a valid ID.
            ...this.validateIDParam({ paramName: "userID" }),

            // 2. Validate that the 'force' query parameter, if it exists, is a boolean.
            query("force")
                .optional()
                .isBoolean()
                .withMessage("force must be boolean"),
        ];
    }

    /**
     * Validates the request for following or unfollowing organizers.
     */
    static validateFollowedOrganizer() {
        return [
            // 1. Validate the userID from the URL parameter.
            ...this.validateIDParam({ paramName: "userID" }),

            // 2. Validate the 'action' field in the request body.
            body("action")
                .exists()
                .withMessage("Action is required")
                .isIn(FOLLOW_ACTION_ENUM)
                .withMessage(
                    `Action must be one of: ${FOLLOW_ACTION_ENUM.join(", ")}`,
                ),

            // 3. Validate that 'followedOrganizers' is a non-empty array.
            body("followedOrganizers")
                .isArray({ min: 1 })
                .withMessage("followedOrganizers must be a non-empty array"),

            // 4. Validate the fields of each object inside the 'followedOrganizers' array.
            // The '*' is a wildcard that applies the validation to every element in the array.
            ...this.validateIDBody({
                fieldName: "followedOrganizers.*.orgID",
                label: "Organizer ID (orgID)",
            }),
            ...this.validateName({
                fieldName: "followedOrganizers.*.orgName",
                optional: false, // orgName is required for each organizer
            }),
            ...this.validateURL({
                fieldName: "followedOrganizers.*.orgAvatar",
                optional: true, // Avatar can be optional
            }),
        ];
    }
    /**
     * Validates the request for creating, updating, or deleting user notifications.
     */
    static validateNotification() {
        return [
            // 1. Validate the user ID from the URL parameter.
            ...this.validateIDParam({ paramName: "id", label: "User ID" }),

            // 2. Validate the 'action' field in the request body.
            body("action")
                .exists()
                .withMessage("Action is required")
                .isIn(NOTIFICATION_ACTION_ENUM)
                .withMessage(
                    `Action must be one of: ${NOTIFICATION_ACTION_ENUM.join(", ")}`,
                ),

            // 3. Validate that 'notificationReferences' is a non-empty array.
            body("notificationReferences")
                .isArray({ min: 1 })
                .withMessage(
                    "notificationReferences must be a non-empty array",
                ),

            // 4. Validate the fields of each object inside the 'notificationReferences' array.
            // The '*' is a wildcard that applies the validation to every element in the array.
            ...this.validateIDBody({
                fieldName: "notificationReferences.*.notificationID",
                label: "Notification ID",
            }),

            body("notificationReferences.*.notificationRef")
                .exists()
                .withMessage(
                    "notificationRef is required for each notification",
                )
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
            // 1. Validate the userID from the URL parameter.
            ...this.validateIDParam({ paramName: "userID", label: "User ID" }),

            // 2. Validate the notificationID from the URL parameter.
            ...this.validateIDParam({
                paramName: "notificationID",
                label: "Notification ID",
            }),

            // 3. Validate the 'status' field in the request body.
            body("status")
                .exists()
                .withMessage("Status is required")
                .isIn(Object.values(NOTIFICATION_STATUS))
                .withMessage(
                    `Invalid status. Allowed values are: ${EnumHelper.enumToString(NOTIFICATION_STATUS)}`,
                ),
        ];
    }

    /**
     * Validates the request for creating, updating, or deleting user notifications.
     */
    static validateNotification() {
        return [
            // 1. Validate the user ID from the URL parameter.
            ...this.validateIDParam({ paramName: "id", label: "User ID" }),

            // 2. Validate the 'action' field in the request body.
            body("action")
                .exists()
                .withMessage("Action is required")
                .isIn(NOTIFICATION_ACTION_ENUM)
                .withMessage(
                    `Action must be one of: ${NOTIFICATION_ACTION_ENUM.join(", ")}`,
                ),

            // 3. Validate that 'notificationReferences' is a non-empty array.
            body("notificationReferences")
                .isArray({ min: 1 })
                .withMessage(
                    "notificationReferences must be a non-empty array",
                ),

            // 4. Validate the fields of each object inside the 'notificationReferences' array.
            // The '*' is a wildcard that applies the validation to every element in the array.
            ...this.validateIDBody({
                fieldName: "notificationReferences.*.notificationID",
                label: "Notification ID",
            }),

            body("notificationReferences.*.notificationRef")
                .exists()
                .withMessage(
                    "notificationRef is required for each notification",
                )
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

    /**
     * Endpoint xác thực cho admin hoặc hệ thống cập nhật hồ sơ người dùng.
     */
    static validateUpdateUser() {
        return [
            ...this.validateIDParam({ paramName: "userID" }),
            ...this.validateEmail({ optional: true }),
            ...this.validateName({ optional: true }),
            ...this._getSharedUserRules({ optional: true }),
            ...this._getOrganizerProfileRules({ conditional: true }),
            ...this._blockSystemFields(
                SYSTEM_FIELDS.filter((f) => f !== "userID"),
            ),
        ];
    }

    static validateCreateUser() {
        return [
            ...this.validateEmail({ optional: false }), // required
            ...this.validateName({ optional: false }), // required
            ...this._getSharedUserRules({ optional: false }),
            ...this._getOrganizerProfileRules({ conditional: true }),
        ];
    }

    static validateGetUsers() {
        return [
            ...this._validatePaginationAndSorting(ALLOWED_USER_SORT_FIELDS),
            query("search")
                .optional()
                .isString()
                .withMessage("Search must be a string"),
            query("isDeleted")
                .optional()
                .isBoolean()
                .withMessage("isDeleted must be a boolean"),
            query("role")
                .optional()
                .isIn(Object.values(ROLE))
                .withMessage(
                    `Role must be one of: ${EnumHelper.enumToString(ROLE)}`,
                ),
        ];
    }

    // ... Các phương thức xác thực khác cho application, notification... không thay đổi ...

    //======================================================================
    //== PRIVATE REUSABLE HELPERS for UserValidator
    //======================================================================
    static _getSharedUserRules({ optional = false } = {}) {
        const chain = (validation) =>
            optional ? validation.optional() : validation;
        return [
            ...this.validatePhoneNumber({ optional }), // Sử dụng tham số `optional` một cách chính xác
            ...this.validateBirthday({ optional }), // Sử dụng tham số `optional` một cách chính xác
            ...this.validateURL({ fieldName: "photoUrl", optional: true }),
            chain(body("role"))
                .isIn(Object.values(ROLE))
                .withMessage(
                    `Role must be one of: ${EnumHelper.enumToString(ROLE)}`,
                )
                .default(ROLE.CUSTOMER),
            chain(body("status"))
                .isIn(Object.values(USER_STATUS))
                .withMessage(
                    `Status must be one of: ${EnumHelper.enumToString(USER_STATUS)}`,
                )
                .default(USER_STATUS.PENDING),
            body("preferenceCategories")
                .optional()
                .isArray({ max: 50 })
                .withMessage(
                    "preferenceCategories must be an array with a max of 50 items.",
                ),
            body("preferenceCategories.*")
                .isString()
                .trim()
                .notEmpty()
                .withMessage("Each category must be a non-empty string."),
        ];
    }

    // OPTIMIZATION: Đơn giản hóa để chỉ sử dụng helper `maybeConditional`.
    static _getOrganizerProfileRules({ conditional = false } = {}) {
        const maybeConditional = (rule) =>
            conditional ? rule.if(body("role").equals(ROLE.ORGANIZER)) : rule;

        // Tạo các chuỗi validator riêng lẻ để áp dụng điều kiện
        const organizerTypeChain = body("organizerType")
            .optional()
            .isIn(["personal", "business"])
            .withMessage("organizerType must be 'personal' or 'business'");
        const bioChain = body("bio")
            .optional()
            .isString()
            .isLength({ max: 1000 })
            .withMessage("Bio must be a string up to 1000 chars");
        const websiteUrlChain = this.validateURL({
            fieldName: "websiteUrl",
            optional: true,
        });
        const facebookUrlChain = this.validateURL({
            fieldName: "facebookUrl",
            patterns: ["facebook.com"],
            optional: true,
        });
        const instagramUrlChain = this.validateURL({
            fieldName: "instagramUrl",
            patterns: ["instagram.com"],
            optional: true,
        });
        const xUrlChain = this.validateURL({
            fieldName: "xUrl",
            patterns: ["x.com", "twitter.com"],
            optional: true,
        });

        return [
            maybeConditional(organizerTypeChain),
            maybeConditional(bioChain),
            ...websiteUrlChain.map(maybeConditional),
            ...facebookUrlChain.map(maybeConditional),
            ...instagramUrlChain.map(maybeConditional),
            ...xUrlChain.map(maybeConditional),
        ];
    }

    static _validatePaginationAndSorting(allowedSortFields) {
        return [
            query("limit")
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage("Limit must be an integer between 1 and 100")
                .toInt(),
            query("sortOrder")
                .optional()
                .isIn(SORT_ORDER)
                .withMessage(
                    `sortOrder must be one of: ${SORT_ORDER.join(", ")}`,
                ),
            query("sortBy")
                .optional()
                .default("createdAt")
                .customSanitizer((value) =>
                    value === "username"
                        ? "usernameLowerCase"
                        : value === "orgName"
                          ? "orgName_lowercase"
                          : value,
                )
                .isIn(allowedSortFields)
                .withMessage(
                    `sortBy must be one of: ${allowedSortFields.join(", ")}`,
                ),
            query("lastVisibleValue")
                .optional()
                .custom((value, { req }) => {
                    const sortBy = req.query.sortBy || "createdAt";
                    const numericSorts = [
                        "createdAt",
                        "updatedAt",
                        "lastRejectedAt",
                        "rejectCount",
                        "birthday",
                    ];
                    if (numericSorts.includes(sortBy)) {
                        if (isNaN(Number(value))) {
                            throw new Error(
                                `lastVisibleValue must be a numeric timestamp/value when sortBy is ${sortBy}`,
                            );
                        }
                    } else if (
                        typeof value !== "string" ||
                        value.length === 0
                    ) {
                        throw new Error(
                            `lastVisibleValue must be a non-empty string when sortBy is ${sortBy}`,
                        );
                    }
                    return true;
                }),
        ];
    }

    static _validateDateRange() {
        return [
            query("dateFrom")
                .optional()
                .isISO8601()
                .withMessage("dateFrom must be a valid ISO8601 date")
                .toDate(),
            query("dateTo")
                .optional()
                .isISO8601()
                .withMessage("dateTo must be a valid ISO8601 date")
                .toDate()
                .custom((dateTo, { req }) => {
                    if (req.query.dateFrom && dateTo < req.query.dateFrom) {
                        throw new Error("dateTo must be on or after dateFrom");
                    }
                    return true;
                }),
        ];
    }

    static _blockSystemFields(fieldList) {
        return [
            body(fieldList)
                .not()
                .exists()
                .withMessage(
                    (value, { path }) =>
                        `You cannot update the restricted field '${path}'`,
                ),
        ];
    }
}
