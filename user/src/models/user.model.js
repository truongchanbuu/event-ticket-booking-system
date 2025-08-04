import { ORGANIZER_STATUS } from "@event_ticket_booking_system/shared";
import ROLE from "../enums/role.enum";
import { USER_STATUS } from "../enums/user_status.enum";

export default {
    collection: "users",
    fields: {
        userID: String,
        email: String,
        username: String,
        phoneNumber: String,
        role: ROLE,
        photoUrl: String,
        birthday: Date,
        emailVerified: Boolean,
        phoneNumberVerified: Boolean,
        followedOrganizers: [], // subcollection
        preferenceCategories: [], // string array
        notificationReferences: [], // notification ids
        createdAt: Date,
        updatedAt: Date | null,
        status: USER_STATUS,
        organizerStatus: ORGANIZER_STATUS,
        reportCount: 0,
        riskScore: 0, // 0-1
    },
};
