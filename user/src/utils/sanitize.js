/**
 * @fileoverview
 * Mô-đun tiện ích cho việc làm sạch (sanitizing) dữ liệu người dùng dựa trên quyền của người xem.
 * Cung cấp các lớp bảo vệ để ngăn chặn rò rỉ thông tin nhạy cảm trong các phản hồi API.
 *
 * Các tính năng chính:
 * - Lọc trường (field) dựa trên vai trò: admin, chủ sở hữu (self), công khai.
 * - Danh sách đen (blacklist) các trường nhạy cảm tuyệt đối.
 * - Cho phép ghi đè bằng danh sách trắng (whitelist) và danh sách đen (blacklist) tùy chỉnh.
 * - Chống tham chiếu vòng tròn để ngăn chặn tấn công DoS.
 * - Các hàm bao bọc (wrapper) tiện lợi cho các trường hợp sử dụng phổ biến.
 */

// --- ĐỊNH NGHĨA CÁC BỘ TRƯỜNG (FIELD SETS) ---

// Các trường nhạy cảm không bao giờ được hiển thị, trừ khi cho chính chủ sở hữu.
const SENSITIVE_FIELDS = new Set([
    // --- PII (Thông tin nhận dạng cá nhân) ---
    "email",
    "phoneNumber",
    "password",
    "passwordHash",
    "salt",
    "socialSecurityNumber",
    "personalAddress",
    "homeAddress",
    "personalPhoneNumber",
    "birthday",
    // --- Tokens & Secrets ---
    "refreshToken",
    "accessToken",
    "resetToken",
    "verificationToken",
    "twoFactorSecret",
    "backupCodes",
    "apiKeys",
    "webhookSecrets",
    // --- Dữ liệu hệ thống và bảo mật ---
    "ipAddress",
    "deviceId",
    "sessionId",
    "nextOfKin",
    "emergencyContact",
    // --- Thông tin tài chính và kinh doanh của nhà tổ chức ---
    "stripeAccountId",
    "stripeCustomerId",
    "paypalAccountId",
    "paymentGatewayKeys",
    "bankAccountNumber",
    "routingNumber",
    "ein",
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

// Các trường chỉ dành cho quản trị viên (Admin).
const ADMIN_ONLY_FIELDS = new Set([
    // --- Metadata tài khoản ---
    "isDeleted",
    "status",
    "createdAt",
    "updatedAt",
    "deletedAt",
    "suspendedAt",
    "verifiedAt",
    "lastLoginAt",
    "loginAttempts",
    "lockedUntil",
    "failedLoginAttempts",
    // --- Dữ liệu quản trị và kiểm duyệt ---
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
    // --- Dữ liệu quản trị dành riêng cho nhà tổ chức ---
    "organizerApplicationDate",
    "organizerApprovalDate",
    "organizerReviewNotes",
    "organizerRejectionReason",
    "organizerVerificationLevel",
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

// Các trường chỉ chủ sở hữu mới có thể xem (ngoài các trường nhạy cảm đã được xử lý).
const OWNER_ONLY_FIELDS = new Set([
    // --- Thông tin cá nhân (đã được bao gồm trong SENSITIVE nhưng cần liệt kê để isSelf có hiệu lực) ---
    "email",
    "phoneNumber",
    "birthday",
    // --- Cài đặt và sở thích ---
    "preferenceCategories",
    "notificationSettings",
    "privacySettings",
    "paymentMethods",
    "addresses",
    "emergencyContacts",
    "medicalInfo",
    "personalNotes",
    // --- Thông tin kinh doanh của nhà tổ chức ---
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

// Các trường công khai, an toàn để hiển thị cho tất cả mọi người.
const PUBLIC_FIELDS = new Set([
    "userID",
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
    "joinedDate",
    "location",
    "timezone",
    "language",
    "publicBadges",
    "certifications",
    "skills",
    "interests",
]);

// Các trường được miễn trừ khỏi việc kiểm duyệt chuỗi (redaction).
const FIELDS_EXCLUDED_FROM_REDACTION = new Set([
    "note",
    "description",
    "comment",
    "feedback",
    "bio",
]);

// --- CÁC HÀM TIỆN ÍCH NỘI BỘ ---

/**
 * Kiểm tra xem tên trường có gợi ý rằng nó chứa thông tin nhạy cảm hay không.
 * @param {string} fieldName - Tên trường cần kiểm tra.
 * @returns {boolean} True nếu tên trường có vẻ nhạy cảm.
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
        /ssn/i,
        /tax/i,
        /bank/i,
        /card/i,
        /license/i,
        /passport/i,
        /address/i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(fieldName));
}

/**
 * Làm sạch một chuỗi để loại bỏ các mẫu thông tin nhạy cảm tiềm tàng.
 * @param {string} str - Chuỗi cần làm sạch.
 * @param {string} fieldName - Tên trường để xác định ngữ cảnh.
 * @returns {string} Chuỗi đã được làm sạch.
 */
function sanitizeString(str) {
    if (typeof str !== "string") return str;
    // Đơn giản hóa: Hiện tại chỉ trả về chuỗi gốc.
    // Logic kiểm duyệt (redaction) có thể được thêm vào đây nếu cần.
    // Ví dụ: str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED]");
    return str;
}

/**
 * Làm sạch giá trị của từng trường một cách đệ quy.
 * @param {*} value - Giá trị của trường.
 * @param {string} fieldName - Tên trường để xác định ngữ cảnh.
 * @param {WeakSet<object>} visited - Một Set để theo dõi các đối tượng đã duyệt qua nhằm tránh tham chiếu vòng tròn.
 * @returns {*} Giá trị đã được làm sạch.
 */
function sanitizeFieldValue(value, fieldName, visited) {
    // Xử lý các giá trị không phải đối tượng hoặc null
    if (typeof value !== "object" || value === null) {
        if (
            typeof value === "string" &&
            !FIELDS_EXCLUDED_FROM_REDACTION.has(fieldName.toLowerCase())
        ) {
            return sanitizeString(value);
        }
        return value;
    }

    // --- BẢO VỆ CHỐNG THAM CHIẾU VÒNG TRÒN ---
    if (visited.has(value)) {
        return "[Circular Reference]";
    }
    visited.add(value);
    // -------------------------------------------

    // Xử lý Date objects
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Xử lý mảng (Array)
    if (Array.isArray(value)) {
        return value.map((item, index) =>
            sanitizeFieldValue(item, `${fieldName}[${index}]`, visited),
        );
    }

    // Xử lý các đối tượng thuần (plain objects)
    if (value.constructor === Object) {
        const sanitizedObj = {};
        for (const key in value) {
            // Chỉ xử lý các thuộc tính của chính đối tượng đó
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                // Tiếp tục làm sạch các trường con
                sanitizedObj[key] = sanitizeFieldValue(
                    value[key],
                    key,
                    visited,
                );
            }
        }
        return sanitizedObj;
    }

    // Trả về các loại đối tượng khác (ví dụ: Buffer) mà không thay đổi
    return value;
}

// --- HÀM LÀM SẠCH CHÍNH ---

/**
 * Làm sạch dữ liệu người dùng dựa trên quyền của người xem.
 * @param {Object} user - Đối tượng người dùng cần làm sạch.
 * @param {Object} options - Các tùy chọn làm sạch.
 * @param {boolean} [options.isAdmin=false] - Người xem có phải là admin không.
 * @param {boolean} [options.isSelf=false] - Người xem có phải là chính người dùng đó không.
 * @param {string|null} [options.viewerRole=null] - Vai trò của người xem.
 * @param {string[]} [options.allowedFields=[]] - Các trường được cho phép rõ ràng.
 * @param {string[]} [options.deniedFields=[]] - Các trường bị từ chối rõ ràng.
 * @param {boolean} [options.strictMode=false] - Chỉ cho phép các trường trong `allowedFields`.
 * @returns {Object} Đối tượng người dùng đã được làm sạch.
 */
export function sanitizeUserData(user, options = {}) {
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

    const sanitizedUser = {};
    const visited = new WeakSet(); // Khởi tạo bộ theo dõi cho mỗi lần gọi chính

    const hasAdminAccess =
        isAdmin || viewerRole === "admin" || viewerRole === "superadmin";

    for (const field in user) {
        if (!Object.prototype.hasOwnProperty.call(user, field)) {
            continue;
        }

        const value = user[field];
        if (value === null || value === undefined) {
            continue;
        }

        // --- QUY TẮC ƯU TIÊN ---

        // 1. LUÔN TỪ CHỐI (DENY): Các trường bị từ chối rõ ràng.
        if (deniedFields.includes(field)) {
            continue;
        }

        // 2. LUÔN CHO PHÉP (ALLOW): Các trường được cho phép rõ ràng.
        if (allowedFields.includes(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field, visited);
            continue;
        }

        // 3. CHẾ ĐỘ NGHIÊM NGẶT (STRICT MODE): Nếu bật, chỉ các trường trong `allowedFields` mới được qua.
        if (strictMode) {
            continue;
        }

        // 4. BẢO MẬT TUYỆT ĐỐI (SENSITIVE): Từ chối các trường nhạy cảm, TRỪ KHI người xem là chính chủ.
        if (SENSITIVE_FIELDS.has(field) && !isSelf) {
            continue;
        }

        // --- QUY TẮC DỰA TRÊN VAI TRÒ ---

        // 5. QUYỀN ADMIN: Cho phép các trường chỉ dành cho admin.
        if (hasAdminAccess && ADMIN_ONLY_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field, visited);
            continue;
        }

        // 6. QUYỀN SỞ HỮU: Cho phép các trường chỉ dành cho chủ sở hữu.
        if (isSelf && OWNER_ONLY_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field, visited);
            continue;
        }

        // 7. CÔNG KHAI: Cho phép các trường công khai.
        if (PUBLIC_FIELDS.has(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field, visited);
            continue;
        }

        // 8. DỰ PHÒNG: Xử lý các trường không xác định.
        // Chỉ cho phép admin hoặc chủ sở hữu thấy nếu tên trường không có vẻ nhạy cảm.
        if ((hasAdminAccess || isSelf) && !looksLikeSensitiveField(field)) {
            sanitizedUser[field] = sanitizeFieldValue(value, field, visited);
        }
    }

    return sanitizedUser;
}

// --- CÁC HÀM BAO BỌC TIỆN LỢI ---

/**
 * Wrapper đơn giản cho các trường hợp phổ biến.
 * @param {Object} user - Đối tượng người dùng.
 * @param {boolean} [isAdmin=false] - Người xem có phải là admin không.
 * @param {boolean} [isSelf=false] - Người xem có phải là chính người dùng đó không.
 * @returns {Object} Đối tượng người dùng đã được làm sạch.
 */
export function sanitizeUserDataSimple(user, isAdmin = false, isSelf = false) {
    return sanitizeUserData(user, { isAdmin, isSelf });
}

/**
 * Làm sạch dữ liệu cho các phản hồi API công khai (chỉ giữ lại các trường công khai).
 * @param {Object} user - Đối tượng người dùng.
 * @returns {Object} Đối tượng người dùng đã được làm sạch.
 */
export function sanitizeUserDataPublic(user) {
    // Sử dụng strictMode để đảm bảo chỉ các trường trong PUBLIC_FIELDS được trả về.
    return sanitizeUserData(user, {
        strictMode: true,
        allowedFields: Array.from(PUBLIC_FIELDS),
    });
}

/**
 * Làm sạch dữ liệu cho chính người dùng xem hồ sơ của họ.
 * @param {Object} user - Đối tượng người dùng.
 * @returns {Object} Đối tượng người dùng đã được làm sạch.
 */
export function sanitizeUserDataOwner(user) {
    return sanitizeUserData(user, { isSelf: true });
}

/**
 * Làm sạch dữ liệu cho quản trị viên xem.
 * @param {Object} user - Đối tượng người dùng.
 * @returns {Object} Đối tượng người dùng đã được làm sạch.
 */
export function sanitizeUserDataAdmin(user) {
    return sanitizeUserData(user, { isAdmin: true });
}

/**
 * Chuẩn hóa đối tượng người dùng từ Firebase Decoded ID Token.
 * @param {object} decodedToken - Đối tượng token đã được giải mã từ Firebase Admin SDK.
 * @returns {object} Đối tượng người dùng với các trường đã được chuẩn hóa.
 */
export function normalizeFirebaseUser(decodedToken) {
    if (!decodedToken) return null;
    return {
        userID: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
        phoneNumber: decodedToken.phone_number || null,
        username:
            decodedToken.name || decodedToken.email?.split("@")[0] || null,
        photoUrl: decodedToken.picture || null,
        provider: decodedToken.firebase?.sign_in_provider || "unknown",
    };
}
