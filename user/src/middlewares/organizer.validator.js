import { body, query } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";

export default class OrganizerValidator extends BaseValidator {
    /**
     * Validates the entire application form for becoming an event organizer.
     * Contains conditional logic based on the application type (individual/business).
     */
    static validateEventOrgApplication() {
        return [
            // 1. Validate the application type, which is required and must be one of the allowed values.
            body("applyType")
                .notEmpty()
                .withMessage("Apply type is required")
                .isIn(["individual", "business"])
                .withMessage(
                    "Invalid apply type. Must be 'individual' or 'business'.",
                ),

            // 2. Validate common organization information.
            ...this.validateName({
                fieldName: "orgName",
                optional: false,
            }),

            body("description")
                .notEmpty()
                .withMessage("Organization description is required")
                .isLength({ min: 10, max: 1000 })
                .withMessage(
                    "Description must be between 10 and 1000 characters",
                ),

            // 3. Apply conditional KYC/KYB rules.
            // This helper encapsulates the complex logic of checking fields based on 'applyType'.
            ...this._getKycRules({ optional: false }),

            // 4. Validate optional contact and social media information.
            // These fields are prefixed with 'optionalInfo.' as per the original structure.
            ...this.validateURL({
                fieldName: "optionalInfo.websiteUrl",
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.facebookUrl",
                patterns: ["facebook.com"],
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.instagramUrl",
                patterns: ["instagram.com"],
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.tiktokUrl",
                patterns: ["tiktok.com"],
                optional: true,
            }),
            ...this.validatePhoneNumber({
                fieldName: "optionalInfo.phoneNumber",
                optional: true,
            }),
            ...this.validateEmail({
                fieldName: "optionalInfo.email",
                optional: true,
            }),
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
                fieldName: "optionalInfo.websiteUrl",
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.facebookUrl",
                patterns: ["facebook.com"],
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.instagramUrl",
                patterns: ["instagram.com"],
                optional: true,
            }),
            ...this.validateURL({
                fieldName: "optionalInfo.tiktokUrl",
                patterns: ["tiktok.com"],
                optional: true,
            }),

            // 5. Explicitly block any attempt to update restricted, system-managed fields.
            ...this._blockSystemFields(restrictedFields),
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
