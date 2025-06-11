import ROLE from "../enums/role.enum";
import { USER_STATUS } from "../enums/user_status.enum";

export default {
    collection: "users",
    fields: {
        userID: String,
        email: String,
        password: String,
        username: String,
        phoneNumber: String,
        role: ROLE,
        birthday: Date,
        followedOrganizers: [], // subcollection
        preferenceCategories: [],
        notificationReferences: [], // notification ids
        createdAt: Date,
        updatedAt: Date | null,
        status: USER_STATUS,
    },
};
