import { body, query } from "express-validator";
import {
    APPLY_STATUS,
    BaseValidator,
} from "@event_ticket_booking_system/shared";
import { MAX_BIO_TEXT, MIN_BIO_TEXT } from "../config/constants.js";

export default class OrganizerValidator extends BaseValidator {
    /**
     * Validates the entire application form for becoming an event organizer.
     * Contains conditional logic based on the application type (individual/business).
     */
    static validateEventOrgApplication() {
        return [
            // --- 1. Validate top-level fields ---
            body("applyType")
                .notEmpty()
                .withMessage("Application type is required.")
                .isIn(["personal", "business"])
                .withMessage(
                    "Invalid application type. Must be 'personal' or 'business'.",
                ),

            // --- 2. Validate 'applicationData' object ---
            body("applicationData")
                .isObject()
                .withMessage("applicationData must be an object."),
            body("applicationData.orgName")
                .trim()
                .notEmpty()
                .withMessage("Organizer name is required.")
                .isLength({ min: 2 })
                .withMessage("Organizer name must be at least 2 characters."),
            body("applicationData.description")
                .trim()
                .isLength({ min: MIN_BIO_TEXT, max: MAX_BIO_TEXT })
                .withMessage(
                    `Description must be between ${MIN_BIO_TEXT} and ${MAX_BIO_TEXT} characters.`,
                ),
            body("applicationData.website")
                .optional({ checkFalsy: true })
                .isURL()
                .withMessage("Invalid website URL."),
            body("applicationData.facebook")
                .optional({ checkFalsy: true })
                .isURL()
                .withMessage("Invalid Facebook URL."),
            body("applicationData.instagram")
                .optional({ checkFalsy: true })
                .isURL()
                .withMessage("Invalid Instagram URL."),
            body("applicationData.x")
                .optional({ checkFalsy: true })
                .isURL()
                .withMessage("Invalid X (Twitter) URL."),

            // --- 3. Validate 'representativeInfo' (KYC - Always required) ---
            body("representativeInfo")
                .isObject()
                .withMessage("representativeInfo must be an object."),
            body("representativeInfo.fullName")
                .notEmpty()
                .withMessage("Full name of the representative is required."),
            body("representativeInfo.idNumber")
                .notEmpty()
                .withMessage("National ID number is required."),
            body("representativeInfo.dob")
                .notEmpty()
                .withMessage("Date of birth is required.")
                .matches(/^\d{2}\/\d{2}\/\d{4}$/)
                .withMessage("Date of birth must be in DD/MM/YYYY format."),
            body("representativeInfo.gender")
                .notEmpty()
                .withMessage("Gender is required.")
                .custom((value) => {
                    const lowerCaseValue = String(value).toLowerCase();
                    return ["male", "female", "other", "nam", "nữ"].includes(
                        lowerCaseValue,
                    );
                })
                .withMessage("Invalid gender."),
            body("representativeInfo.nationality")
                .notEmpty()
                .withMessage("Nationality is required."),
            body("representativeInfo.placeOfOrigin")
                .notEmpty()
                .withMessage("Place of origin is required."),
            body("representativeInfo.permanentAddress")
                .notEmpty()
                .withMessage("Permanent address is required."),
            body("representativeInfo.idIssueDate")
                .notEmpty()
                .withMessage("ID issue date is required.")
                .matches(/^\d{2}\/\d{2}\/\d{4}$/)
                .withMessage("ID issue date must be in DD/MM/YYYY format."),
            body("representativeInfo.idIssuedBy")
                .notEmpty()
                .withMessage("Issuing authority is required."),

            // --- 4. Validate 'businessInfo' (CONDITIONAL: only if applyType === 'business') ---
            body("businessInfo")
                .if(body("applyType").equals("business"))
                .isObject()
                .withMessage(
                    "businessInfo is required for business applications.",
                ),
            body("businessInfo.legalName")
                .if(body("applyType").equals("business"))
                .notEmpty()
                .withMessage("Legal name of the business is required."),
            body("businessInfo.taxCode")
                .if(body("applyType").equals("business"))
                .notEmpty()
                .withMessage("Tax code is required."),
            body("businessInfo.address")
                .if(body("applyType").equals("business"))
                .notEmpty()
                .withMessage("Business address is required."),

            // --- 5. Validate 'documents' object ---
            body("documents")
                .isArray({ min: 1 })
                .withMessage("Documents must be a non-empty array."),
            body("documents.*.documentName")
                .isString()
                .withMessage("documentName must be a string.")
                .notEmpty()
                .withMessage("documentName is required."),
            body("documents.*.documentType")
                .isString()
                .withMessage("documentType must be a string.")
                .notEmpty()
                .withMessage("documentType is required."),
            body("documents.*.fileUrl")
                .isString()
                .withMessage("fileUrl must be a string.")
                .notEmpty()
                .withMessage("fileUrl is required.")
                .isURL()
                .withMessage("fileUrl must be a valid URL."),

            // --- 6. Validate 'eventPermitInfo' (CONDITIONAL: only if object is not empty) ---
            body("eventPermitInfo.eventName")
                .if(
                    body("eventPermitInfo").custom(
                        this.ifObjectExistsAndIsNotEmpty,
                    ),
                )
                .notEmpty()
                .withMessage(
                    "Event name is required when event permit information is provided.",
                ),

            body("eventPermitInfo.permitNumber")
                .if(
                    body("eventPermitInfo").custom(
                        this.ifObjectExistsAndIsNotEmpty,
                    ),
                )
                .notEmpty()
                .withMessage(
                    "Permit number is required when event permit information is provided.",
                ),

            body("eventPermitInfo.eventDate")
                .if(
                    body("eventPermitInfo").custom(
                        this.ifObjectExistsAndIsNotEmpty,
                    ),
                )
                .notEmpty()
                .withMessage(
                    "Event date is required when event permit information is provided.",
                )
                .isISO8601()
                .withMessage(
                    "Event date must be a valid ISO 8601 date string.",
                ),
        ];
    }

    /**
     * Validates the request to delete an organizer application.
     * Supports optional force deletion and a reason.
     */
    static validateDeleteApplication() {
        return [
            // 1. Validate the applicationID from the URL parameter. It's required.
            ...this.validateIDParam({
                paramName: "applicationID",
                label: "Application ID",
            }),

            // 2. Validate the 'force' query parameter. It's optional, but if present, must be a boolean.
            query("force")
                .optional()
                .isBoolean()
                .withMessage(
                    "The 'force' parameter must be a boolean (true/false).",
                ),

            // 3. Validate the 'reason' field in the body. It's optional, but if present, must be a non-empty string.
            body("reason")
                .optional()
                .isString()
                .withMessage("Reason must be a string.")
                .notEmpty()
                .withMessage("Reason cannot be an empty string."),
        ];
    }

    /**
     * Validates the request for a user to update their own pending application.
     * All user-updatable fields are optional, and system-managed fields are forbidden.
     */
    static validateUpdateApplication() {
        // Define the list of fields that are managed by the system and cannot be updated by the user.
        const restrictedFields = [
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
        ];

        return [
            // 1. Validate the applicationID from the URL parameter. It's required.
            ...this.validateIDParam({
                paramName: "applicationID",
                label: "Application ID",
            }),

            // 2. Validate optional organization info. If provided, it must be valid.
            body("orgName")
                .optional()
                .isString()
                .trim()
                .notEmpty()
                .withMessage("Organization name cannot be empty"),

            body("description")
                .optional()
                .isString()
                .trim()
                .isLength({ min: 10, max: 1000 })
                .withMessage(
                    "Description must be between 10 and 1000 characters",
                ),

            // 3. Allow updates to KYC/KYB info by making all its internal fields optional.
            ...this._getKycRules({ optional: true }),

            // 4. Validate other optional contact and social media URLs.
            ...this.validateURL({
                fieldName: "optionalInfo.website",
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.facebook",
                patterns: ["facebook.com"],
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.instagram",
                patterns: ["instagram.com"],
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.x",
                patterns: ["tiktok.com"],
                optional: true,
            }),

            // 5. Explicitly block any attempt to update restricted, system-managed fields.
            ...this._blockSystemFields(restrictedFields),
        ];
    }

    static validateGetAllApplications() {
        const ALLOWED_SORT_FIELDS = [
            "createdAt",
            "submittedAt",
            "updatedAt",
            "orgName",
        ];

        return [
            // Validation cho 'limit'
            query("limit")
                .optional() // Không bắt buộc
                .isInt({ min: 1, max: 100 })
                .withMessage("Limit must be an integer between 1 and 100")
                .toInt(), // Sanitizer: Chuyển đổi thành số nguyên

            // Validation cho 'status'
            query("status")
                .optional()
                .isString()
                .isIn(Object.values(APPLY_STATUS))
                .withMessage(
                    `Status must be one of: ${Object.values(APPLY_STATUS).join(", ")}`,
                ),

            // Validation cho 'sortBy'
            query("sortBy")
                .optional()
                .isString()
                .isIn(ALLOWED_SORT_FIELDS)
                .withMessage(
                    `SortBy must be one of: ${ALLOWED_SORT_FIELDS.join(", ")}`,
                ),

            // Validation cho 'sortOrder'
            query("sortOrder")
                .optional()
                .isString()
                .isIn(["asc", "desc"])
                .withMessage('SortOrder must be "asc" or "desc"'),

            // Validation cho các cờ boolean
            query("hasCooldown")
                .optional()
                .isBoolean()
                .withMessage("hasCooldown must be a boolean")
                .toBoolean(),
            query("requiresAdminApproval")
                .optional()
                .isBoolean()
                .withMessage("requiresAdminApproval must be a boolean")
                .toBoolean(),

            // Validation cho các ID
            query("userID")
                .optional()
                .isString()
                .notEmpty()
                .withMessage("userID must be a non-empty string"),

            // Validation cho ngày tháng (chuẩn ISO 8601)
            query("dateFrom")
                .optional()
                .isISO8601()
                .withMessage("dateFrom must be a valid ISO 8601 date")
                .toDate(),
            query("dateTo")
                .optional()
                .isISO8601()
                .withMessage("dateTo must be a valid ISO 8601 date")
                .toDate(),

            // Validation cho các số
            query("minRejectCount")
                .optional()
                .isInt({ min: 0 })
                .withMessage("minRejectCount must be a non-negative integer")
                .toInt(),
            query("maxRejectCount")
                .optional()
                .isInt({ min: 0 })
                .withMessage("maxRejectCount must be a non-negative integer")
                .toInt(),

            // lastVisibleValue thường là một chuỗi phức tạp, chỉ cần kiểm tra là string là đủ
            query("lastVisibleValue").optional().isString(),
        ];
    }

    static _getKycRules({ optional = false } = {}) {
        const ifIndividual = body().if(body("applyType").equals("individual"));
        const ifBusiness = body().if(body("applyType").equals("business"));
        const chain = (validation) =>
            optional
                ? validation.optional()
                : validation.notEmpty().withMessage("This field is required");
        const urlChain = (validation) =>
            (optional ? validation.optional() : validation)
                .isURL()
                .withMessage("Must be a valid URL");
        const dateChain = (validation) =>
            (optional ? validation.optional() : validation)
                .isISO8601()
                .withMessage("Must be a valid ISO8601 date");
        return [
            chain(body("kycInfo.fullName").if(ifIndividual)),
            chain(body("kycInfo.idNumber").if(ifIndividual)),
            dateChain(body("kycInfo.dob").if(ifIndividual)),
            dateChain(body("kycInfo.idIssueDate").if(ifIndividual)),
            chain(body("kycInfo.idIssuedBy").if(ifIndividual)),
            urlChain(body("kycInfo.idFrontImageUrl").if(ifIndividual)),
            urlChain(body("kycInfo.idBackImageUrl").if(ifIndividual)),
            chain(body("kycInfo.businessName").if(ifBusiness)),
            chain(body("kycInfo.registrationNumber").if(ifBusiness)),
            dateChain(body("kycInfo.issueDate").if(ifBusiness)),
            chain(body("kycInfo.issuedBy").if(ifBusiness)),
            chain(body("kycInfo.businessType").if(ifBusiness)),
            urlChain(body("kycInfo.businessLicenseUrl").if(ifBusiness)),
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
