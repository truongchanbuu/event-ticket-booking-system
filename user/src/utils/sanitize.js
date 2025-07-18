// Define sensitive fields that should never be exposed
const SENSITIVE_FIELDS = new Set([
    "email",
    "phoneNumber",
    "password",
    "passwordHash",
    "salt",
    "refreshToken",
    "accessToken",
    "socialSecurityNumber",
    "creditCardNumber",
    "bankAccount",
    "taxId",
    "passport",
    "driverLicense",
    "ipAddress",
    "deviceId",
    "sessionId",
    "resetToken",
    "verificationToken",
    "twoFactorSecret",
    "backupCodes",
    "apiKeys",
    "webhookSecrets",
    // Event organizer specific sensitive fields
    "stripeAccountId",
    "stripeCustomerId",
    "paypalAccountId",
    "paymentGatewayKeys",
    "bankAccountNumber",
    "routingNumber",
    "ein",
    "businessLicense",
    "personalAddress",
    "homeAddress",
    "personalPhoneNumber",
    "emergencyContact",
    "nextOfKin",
    "w9Form",
    "taxDocuments",
    "identityDocuments",
    "backgroundCheckResults",
    "revenueData",
    "earningsData",
    "payoutDetails",
    "commissionDetails",
    "contractTerms",
    "legalAgreements",
    "liabilityInsurance",
    "bondInformation",
]);

// Define admin-only fields that should only be shown to administrators
const ADMIN_ONLY_FIELDS = new Set([
    "isDeleted",
    "status",
    "birthday",
    "preferenceCategories",
    "createdAt",
    "updatedAt",
    "userID",
    "deletedAt",
    "suspendedAt",
    "verifiedAt",
    "lastLoginAt",
    "loginAttempts",
    "lockedUntil",
    "failedLoginAttempts",
    "accountFlags",
    "internalNotes",
    "moderatorNotes",
    "complianceFlags",
    "riskScore",
    "fraudScore",
    "kycStatus",
    "documentVerificationStatus",
    "auditLog",
    "permissions",
    "roles",
    "adminLevel",
    // Event organizer specific admin fields
    "organizerApplicationDate",
    "organizerApprovalDate",
    "organizerReviewNotes",
    "organizerRejectionReason",
    "organizerVerificationLevel",
    "organizerVerificationDocuments",
    "organizerComplianceStatus",
    "organizerRiskAssessment",
    "organizerTaxStatus",
    "organizerPayoutStatus",
    "organizerContractStatus",
    "organizerPerformanceMetrics",
    "organizerReputationScore",
    "organizerComplaintHistory",
    "organizerSupportTickets",
    "organizerRefundHistory",
    "organizerChargebackHistory",
    "organizerFraudAlerts",
    "organizerAccountHealth",
    "organizerOnboardingStatus",
    "organizerKycDocuments",
    "organizerBusinessDocuments",
    "organizerBackgroundCheck",
    "organizerCreditCheck",
    "organizerBlacklistStatus",
    "organizerWatchlistStatus",
]);

// Define owner-only fields that should only be shown to the user themselves
const OWNER_ONLY_FIELDS = new Set([
    "email",
    "phoneNumber",
    "birthday",
    "preferenceCategories",
    "notificationSettings",
    "privacySettings",
    "paymentMethods",
    "addresses",
    "emergencyContacts",
    "medicalInfo",
    "personalNotes",
    // Event organizer specific owner fields
    "businessEmail",
    "businessPhoneNumber",
    "businessAddress",
    "businessRegistrationNumber",
    "businessType",
    "organizerDashboardSettings",
    "organizerNotificationPreferences",
    "organizerPayoutPreferences",
    "organizerTaxSettings",
    "organizerBankingInfo",
    "organizerPaymentMethods",
    "organizerWithdrawalMethods",
    "organizerAccountSettings",
    "organizerPrivacySettings",
    "organizerMarketingPreferences",
    "organizerAnalyticsSettings",
    "organizerIntegrationSettings",
    "organizerApiKeys",
    "organizerWebhookSettings",
    "organizerBusinessHours",
    "organizerTimeZone",
    "organizerLanguagePreferences",
    "organizerCurrencyPreferences",
]);

// Define public fields that are safe to show to everyone
const PUBLIC_FIELDS = new Set([
    "username",
    "displayName",
    "firstName",
    "lastName",
    "photoUrl",
    "bio",
    "website",
    "socialMedia",
    "publicProfile",
    "achievements",
    "badges",
    "followersCount",
    "followingCount",
    "postsCount",
    "rating",
    "reviews",
    "publicStats",
    "joinedDate", // Different from createdAt - can be approximate
    "location", // Public location, not precise address
    "timezone",
    "language",
    "publicBadges",
    "certifications",
    "skills",
    "interests",
]);

/**
 * Sanitizes user data based on the viewer's permissions
 * @param {Object} user - The user object to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} options.isAdmin - Whether the viewer is an admin
 * @param {boolean} options.isSelf - Whether the viewer is the user themselves
 * @param {string|null} options.viewerRole - The role of the viewer (admin, moderator, user)
 * @param {Array<string>} options.allowedFields - Explicitly allowed fields (overrides defaults)
 * @param {Array<string>} options.deniedFields - Explicitly denied fields (overrides defaults)
 * @param {boolean} options.strictMode - If true, only allows explicitly whitelisted fields
 * @returns {Object} Sanitized user object
 */
export function sanitizeUserData(user, options = {}) {
    // Input validation
    if (!user || typeof user !== "object") {
        return {};
    }

    const {
        isAdmin = false,
        isSelf = false,
        viewerRole = null,
        allowedFields = [],
        deniedFields = [],
        strictMode = false,
    } = options;

    // Create a copy to avoid mutating the original
    const sanitizedUser = {};

    // Determine permission level
    const hasAdminAccess =
        isAdmin || viewerRole === "admin" || viewerRole === "superadmin";
    const hasModeratorAccess = hasAdminAccess || viewerRole === "moderator";

    Object.keys(user).forEach((field) => {
        const value = user[field];

        // Skip null/undefined values
        if (value === null || value === undefined) {
            return;
        }

        // Always deny explicitly denied fields
        if (deniedFields.includes(field)) {
            return;
        }

        // Always allow explicitly allowed fields (unless they're sensitive)
        if (allowedFields.includes(field) && !SENSITIVE_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field);
            return;
        }

        // Never expose sensitive fields regardless of permissions
        if (SENSITIVE_FIELDS.has(field)) {
            return;
        }

        // In strict mode, only allow explicitly whitelisted fields
        if (strictMode) {
            if (allowedFields.includes(field)) {
                sanitizedUser[field] = sanitizeFieldValue(value, field);
            }
            return;
        }

        // Admin access - can see admin-only fields
        if (hasAdminAccess && ADMIN_ONLY_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field);
            return;
        }

        // Owner access - can see their own sensitive info
        if (isSelf && OWNER_ONLY_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field);
            return;
        }

        // Public fields - safe for everyone
        if (PUBLIC_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field);
            return;
        }

        // For unknown fields, be conservative
        // Only allow if admin or if it's the user's own data
        if (hasAdminAccess || isSelf) {
            // Even then, check if it looks sensitive
            if (!looksLikeSensitiveField(field)) {
                sanitizedUser[field] = sanitizeFieldValue(value, field);
            }
        }
    });

    return sanitizedUser;
}

/**
 * Sanitizes individual field values
 * @param {*} value - The field value
 * @param {string} fieldName - The field name for context
 * @returns {*} Sanitized value
 */
function sanitizeFieldValue(value, fieldName) {
    // Handle objects recursively (but be careful about circular references)
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        if (value.constructor === Object) {
            const sanitizedObj = {};
            Object.keys(value).forEach((key) => {
                if (!SENSITIVE_FIELDS.has(key.toLowerCase())) {
                    sanitizedObj[key] = sanitizeFieldValue(value[key], key);
                }
            });
            return sanitizedObj;
        }
        // For non-plain objects (Date, etc.), return as-is or convert appropriately
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map((item, index) =>
            sanitizeFieldValue(item, `${fieldName}[${index}]`),
        );
    }

    // Handle strings - remove potential sensitive patterns
    if (typeof value === "string") {
        return sanitizeString(value, fieldName);
    }

    // Return primitive values as-is
    return value;
}

/**
 * Sanitizes string values to remove potential sensitive information
 * @param {string} str - The string to sanitize
 * @param {string} fieldName - The field name for context
 * @returns {string} Sanitized string
 */
function sanitizeString(str, fieldName) {
    if (typeof str !== "string") return str;

    let sanitized = str;

    // Remove common sensitive patterns if not in a field that should contain them
    if (
        !fieldName.toLowerCase().includes("note") &&
        !fieldName.toLowerCase().includes("description")
    ) {
        // Remove patterns that look like emails
        sanitized = sanitized.replace(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            "[EMAIL_REDACTED]",
        );

        // Remove patterns that look like phone numbers
        sanitized = sanitized.replace(
            /(\+?1-?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g,
            "[PHONE_REDACTED]",
        );

        // Remove patterns that look like SSNs
        sanitized = sanitized.replace(
            /\b\d{3}-?\d{2}-?\d{4}\b/g,
            "[SSN_REDACTED]",
        );

        // Remove patterns that look like credit cards
        sanitized = sanitized.replace(
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
            "[CARD_REDACTED]",
        );
    }

    return sanitized;
}

/**
 * Checks if a field name suggests it might contain sensitive information
 * @param {string} fieldName - The field name to check
 * @returns {boolean} True if the field might be sensitive
 */
function looksLikeSensitiveField(fieldName) {
    const sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /key/i,
        /auth/i,
        /credential/i,
        /private/i,
        /confidential/i,
        /ssn/i,
        /social/i,
        /tax/i,
        /bank/i,
        /account/i,
        /payment/i,
        /card/i,
        /license/i,
        /passport/i,
        /medical/i,
        /health/i,
        /diagnosis/i,
        /prescription/i,
        /address/i,
        /location/i,
        /coordinate/i,
        /gps/i,
        /ip/i,
        /device/i,
        /session/i,
        /fingerprint/i,
        /biometric/i,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(fieldName));
}

/**
 * Convenience function for the most common use case
 * @param {Object} user - The user object to sanitize
 * @param {boolean} isAdmin - Whether the viewer is an admin
 * @param {boolean} isSelf - Whether the viewer is the user themselves
 * @returns {Object} Sanitized user object
 */
export function sanitizeUserDataSimple(user, isAdmin = false, isSelf = false) {
    return sanitizeUserData(user, { isAdmin, isSelf });
}

/**
 * Sanitizes user data for public API responses
 * @param {Object} user - The user object to sanitize
 * @returns {Object} Sanitized user object with only public fields
 */
export function sanitizeUserDataPublic(user) {
    return sanitizeUserData(user, {
        strictMode: true,
        allowedFields: Array.from(PUBLIC_FIELDS),
    });
}

/**
 * Sanitizes user data for the user's own profile view
 * @param {Object} user - The user object to sanitize
 * @returns {Object} Sanitized user object with owner-accessible fields
 */
export function sanitizeUserDataOwner(user) {
    return sanitizeUserData(user, { isSelf: true });
}

/**
 * Sanitizes user data for admin view
 * @param {Object} user - The user object to sanitize
 * @returns {Object} Sanitized user object with admin-accessible fields
 */
export function sanitizeUserDataAdmin(user) {
    return sanitizeUserData(user, { isAdmin: true });
}

export function normalizeFirebaseUser(decodedToken) {
    return {
        userID: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
        phoneNumber: decodedToken.phone_number || null,
        username: decodedToken.name || null,
        photoUrl: decodedToken.picture || null,
        provider: decodedToken.firebase?.sign_in_provider || "unknown",
    };
}
