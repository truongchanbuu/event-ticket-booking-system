import ROLE from "../enums/role.enum";

export default {
    collection: "users",
    fields: {
        userID: String, // ownerID if it is organizer
        email: String,
        password: String,
        username: String,
        phoneNumber: String,
        role: ROLE,
        birthDate: Date,
        followedOrganizers: [], // organizer id
        preferenceCategories: [],
        notificationReference: [], // notification ids
        createdAt: Date,
        updatedAt: Date | null,

        organizerID: String,
        organizerName: String,
        bio: String,
    },
};
