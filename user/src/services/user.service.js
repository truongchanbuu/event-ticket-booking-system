// import { admin, db } from "../firebase.js";
import { AppError } from "@event_ticket_booking_system/shared";
import { admin, db, serverTimestamp } from "../firebase-emulator.js"; // TODO: Test only
export default class UserService {
    constructor({ logger }) {
        this.logger = logger;
        this.userCollection = db.collection("users");
    }

    async getUsers({
        limit = 20,
        search,
        role,
        status,
        lastVisibleValue,
        sortBy = "createdAt",
        sortOrder = "desc",
    }) {
        sortBy = sortBy == "username" ? "username_lowercase" : sortBy;
        const ALLOWED_SORTED_FIELDS = [
            "createdAt",
            "updatedAt",
            "username_lowercase",
            "email",
            "phoneNumber",
            "birthday",
        ];

        const sortField = ALLOWED_SORTED_FIELDS.includes(sortBy)
            ? sortBy
            : "createdAt";

        let firebaseQuery = this.userCollection;

        if (role) firebaseQuery = firebaseQuery.where("role", "==", role);
        if (status) firebaseQuery = firebaseQuery.where("status", "==", status);

        firebaseQuery = firebaseQuery.orderBy(
            sortField,
            sortOrder === "asc" ? "asc" : "desc",
        );

        if (lastVisibleValue !== undefined) {
            firebaseQuery = firebaseQuery.startAfter(lastVisibleValue);
        }

        firebaseQuery = firebaseQuery.limit(Number(limit));

        const snapshot = await firebaseQuery.get();

        let users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        let filteredUsers = users;
        if (search) {
            const s = search.toLowerCase();
            filteredUsers = users.filter((user) =>
                [user.username_lowercase, user.email].some((field) =>
                    field?.toLowerCase().includes(s),
                ),
            );
        }

        const nextCursor =
            snapshot.docs.length > 0
                ? snapshot.docs[snapshot.docs.length - 1].get(sortField)
                : null;

        return {
            users: filteredUsers,
            nextCursor,
            hasMore: snapshot.docs.length === limit,
        };
    }

    async getUserByEmail(email) {
        const querySnapshot = await this.userCollection
            .where("email", "==", email)
            .limit(1)
            .get();

        return querySnapshot.empty ? null : querySnapshot.docs[0].data();
    }

    async createUser(user) {
        return db.runTransaction(async (transaction) => {
            const emailQuery = this.userCollection
                .where("email", "==", user.email)
                .limit(1);
            const existingUsers = await transaction.get(emailQuery);

            if (!existingUsers.empty) {
                throw new AppError({
                    message: "Email already exists",
                    statusCode: 400,
                    errorCode: "EMAIL_EXISTS",
                });
            }
            user.username_lowercase = user.username.toLowerCase();
            if (user.birthday) {
                user.birthday = Timestamp.fromDate(user.birthday);
            }
            user.createdAt = serverTimestamp;

            user.followedOrganizersCount = 0;
            user.unreadNotificationCount = 0;

            const userID = user.userID || this.userCollection.doc().id;
            const userRef = this.userCollection.doc(userID);

            transaction.set(userRef, {
                ...user,
                userID: userID,
            });

            return { success: true, userID };
        });
    }

    async updateUser(user) {
        const userRef = this.userCollection.doc(user.userID);
        user.updatedAt = serverTimestamp;

        await userRef.update(user);
        return { success: true, userID };
    }

    async followOrganizers(userID, follwedOrganizers) {
        const batch = db.batch();
        const userRef = this.userCollection.doc(userID);

        follwedOrganizers.forEach((org) => {
            if (!org.organizerID) {
                throw new Error("Missing organizerID");
            }

            const orgRef = userRef
                .collection("followedOrganizers")
                .doc(org.organizerID);
            batch.set(orgRef, {
                ...org,
                followedAt: serverTimestamp(),
            });
        });

        batch.update(userRef, {
            followedOrganizersCount: increment(follwedOrganizers.length),
            updatedAt: serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    }

    async unfollowOrganizers(userID, organizerIDs) {
        const batch = db.batch();
        const userRef = this.userCollection.doc(userID);

        organizerIDs.forEach((orgID) => {
            const orgRef = userRef.collection("followedOrganizers").doc(orgID);
            batch.delete(orgRef);
        });

        batch.update(userRef, {
            followedOrganizersCount: increment(-organizerIDs.length),
            updatedAt: serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    }

    async addNotifications(userId, notifications) {
        const batch = db.batch();
        const userRef = this.userCollection.doc(userId);

        let unreadCount = 0;

        notifications.forEach((notification) => {
            const notificationID =
                notification.notificationID ||
                userRef.collection("notifications").doc().id;
            const notifRef = userRef
                .collection("notifications")
                .doc(notificationID);

            const notifData = {
                ...notification,
                notificationID: notificationID,
                createdAt: serverTimestamp(),
                read: notification.read || false,
            };

            if (!notifData.read) {
                unreadCount++;
            }

            batch.set(notifRef, notifData);
        });

        if (unreadCount > 0) {
            batch.update(userRef, {
                unreadNotificationCount: increment(unreadCount),
                updatedAt: serverTimestamp(),
            });
        }

        await batch.commit();
        return { success: true };
    }

    async markNotificationsAsRead(userId, notificationIDs) {
        const batch = db.batch();
        const userRef = this.userCollection.doc(userId);

        notificationIDs.forEach((notificationID) => {
            const notifRef = userRef
                .collection("notifications")
                .doc(notificationID);
            batch.update(notifRef, {
                read: true,
                readAt: serverTimestamp(),
            });
        });

        batch.update(userRef, {
            unreadNotificationCount: increment(-notificationIDs.length),
            updatedAt: serverTimestamp(),
        });

        await batch.commit();
        return { success: true };
    }
}
