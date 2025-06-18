module.exports = {
    collection: "submission_documents",
    fields: {
        documentID: String,
        type: DOCUMENT_TYPE, // ID_FRONT, ID_BACK, LICENSE, PORTRAIT

        applicationID: String,
        userID: String,

        fileName: String,
        fileUrl: String,

        status: "pending" | "approved" | "rejected",
        verifiedBy: "manual" | "ai",
        verifiedAt: Date,

        metadata: {
            // For individual
            ownerName: String || undefined,
            dob: String || undefined,
            addresses: String || undefined,
            ethnicGroup: String || undefined,
            gender: String || undefined,
            nationality: String || undefined,

            // For business
            companyName: String || undefined,
            shortCompanyName: String || undefined,
            companyNameInEnglish: String || undefined,
            authorizedCapital:
                {
                    unit: String,
                    value: Number,
                } || undefined,

            issuedDate: Date || undefined,
            placeOfIssue: String || undefined,
        },

        attempts: 0, // default: 0
        blocked: false, // default: false
        notes: String,

        createdAt: Date,
        updatedAt: Date || undefined,
    },
};
