// Document trong collection "organizerApplications"
// Document ID: oa_xyz789 (có thể dùng ID tự động của Firestore)

const OrganizerApplication = {
    // --- Core Information ---
    userID: "abc123", // ID của người dùng nộp đơn
    status: "pending", // pending, approved, rejected, pending_admin
    applyType: "personal", // 'personal' | 'business'

    // --- Application Data ---
    applicationData: {
        orgName: "CoderHub", // Tên tổ chức/cá nhân
        description: "Chuyên tổ chức hội thảo công nghệ.",
        website: "...",
        facebook: "...",
    },

    // --- KYC/Verification Data ---
    kycInfo: {
        fullName: "Nguyễn Văn A",
        idNumber: "123456789",
        dob: "1995-01-01", // Giữ string nếu chỉ để hiển thị, cân nhắc chuyển sang Timestamp nếu cần query
        idIssueDate: "2015-05-01",
        idIssuedBy: "Cục Cảnh sát QLHC về TTXH", // Tên cơ quan cấp
    },

    // --- Document URLs (QUAN TRỌNG) ---
    documentUrls: {
        identityCardFrontUrl: "https://firebasestorage.googleapis.com/...",
        identityCardBackUrl: "https://firebasestorage.googleapis.com/...",
        businessLicenseUrl: "https://firebasestorage.googleapis.com/...", // Có thể null
        eventLicenseUrl: "https://firebasestorage.googleapis.com/...", // Có thể null
    },

    // --- Moderation & Status Control ---
    moderation: {
        rejectionReason: "Giấy tờ không hợp lệ",
        requiresAdminApproval: false,
        rejectCount: 0,
        lastRejectedAt: null, // Firestore.Timestamp | null
        cooldownUntil: null, // Firestore.Timestamp | null
        reviewedBy: null, // "admin_123" | null
        reviewedAt: null, // Firestore.Timestamp | null
    },

    // --- Timestamps ---
    createdAt: "Firestore.Timestamp", // Sử dụng serverTimestamp() khi tạo
    updatedAt: "Firestore.Timestamp", // Cập nhật mỗi khi có thay đổi
};

/*
// Subcollection: organizerApplications/{applicationID}/statusHistory/{historyID}
const StatusHistoryEntry = {
    status: "rejected",
    reason: "Ảnh chụp CCCD bị lóa, không thấy rõ số.",
    updatedBy: "admin_123", // Hoặc "user" nếu do người dùng cập nhật đơn
    updatedAt: "Firestore.Timestamp",
};
*/
