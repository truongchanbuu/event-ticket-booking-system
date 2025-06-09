export default {
    collection: "organizer_submissions",
    fields: {
        submissionID: String,
        userID: String,
        submissionStatus: SUBMISSION_STATUS,
        documents: [{ documentID: String }],
        createdAt: Date,
        updatedAt: Date,
    },
};
