const OrganizerApplicationSchema = {
    applicationID: "oa_xyz789",
    userID: "abc123",
    applyType: "individual" | "business",
    orgName: "CoderHub",
    description: "Chuyên tổ chức hội thảo công nghệ.",
    kycInfo: {
        fullName: "Nguyễn Văn A",
        idNumber: "123456789",
        dob: "1995-01-01",
        idIssueDate: "2015-05-01",
        idIssuedBy: "Công an TPHCM",
    },
    optionalInfo: {
        websiteUrl: "...",
        facebookUrl: "...",
    },
    status:
        "pending" |
        "approved" |
        "rejected" |
        "permanent_rejected" |
        "pending_admin",
    rejectionReason: "Giấy tờ không hợp lệ",
    requiresAdminApproval: false,
    rejectCount: 0, // Số lần bị reject
    lastRejectedAt: null, // Timestamp lần reject cuối
    cooldownUntil: null, // Thời điểm hết cooldown
    createdAt: "Timestamp",
    updatedAt: "Timestamp",
    reviewedBy: "admin_123", // optional
    reviewedAt: "Timestamp", // optional
};
