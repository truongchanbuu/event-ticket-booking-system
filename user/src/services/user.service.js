import {
    AppError,
    NOTIFICATION_STATUS,
} from "@event_ticket_booking_system/shared";
import {
    db,
    serverTimestamp,
    increment,
    admin,
    auth,
} from "../firebase-emulator.js"; // TODO: Test only
import { sendUserDeleted } from "../kafka/user.event.js";
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

            return { success: true, data: user };
        });
    }

    async updateUser(user) {
        try {
            const userRef = this.userCollection.doc(user.userID);
            user.updatedAt = serverTimestamp;

            await userRef.update(user);
            return { success: true, data: user };
        } catch (e) {
            return { success: false };
        }
    }

    async updateFollowedOrganizers(userID, organizers, action = "follow") {
        const userRef = this.userCollection.doc(userID);
        const batch = db.batch();

        organizers.forEach((org) => {
            const orgRef = userRef
                .collection(ORGANIZERS_COLLECTION)
                .doc(org.orgID);

            if (action === "follow") {
                batch.set(
                    orgRef,
                    {
                        ...org,
                        followedAt: serverTimestamp,
                    },
                    { merge: true },
                );
            } else if (action === "unfollow") {
                batch.delete(orgRef);
            }
        });

        const countDelta =
            action === "follow" ? organizers.length : -organizers.length;

        batch.update(userRef, {
            followedOrganizersCount: increment(countDelta),
            updatedAt: serverTimestamp,
        });

        await batch.commit();
        return organizers.length;
    }

    async updateNotifications(userID, notifications, action = "create") {
        const batch = db.batch();
        const userRef = this.userCollection.doc(userID);
        const notifCollection = userRef.collection(NOTIFICATIONS_COLLECTION);

        let unreadCount = 0;

        notifications.forEach((notif) => {
            const notifID = notif.notificationID;
            if (!notifID && action !== "create") return;

            const notifRef = notifCollection.doc(
                notifID || notifCollection.doc().id,
            );
            const status = notif.status || NOTIFICATION_STATUS.UNREAD;

            if (action === "delete") {
                batch.delete(notifRef);
                if (status === NOTIFICATION_STATUS.UNREAD) unreadCount--;
                return;
            }

            const notifData = {
                ...notif,
                notificationID: notifID || notifRef.id,
                status,
            };

            if (action === "create") {
                notifData.createdAt = serverTimestamp;
                if (status === NOTIFICATION_STATUS.UNREAD) unreadCount++;
                batch.set(notifRef, notifData);
            } else if (action === "update") {
                if (status === NOTIFICATION_STATUS.UNREAD) unreadCount++;
                if (status === NOTIFICATION_STATUS.READ) unreadCount--;
                batch.set(notifRef, notifData, { merge: true });
            }
        });

        if (unreadCount !== 0) {
            batch.update(userRef, {
                unreadNotificationCount: increment(unreadCount),
                updatedAt: serverTimestamp,
            });
        }

        await batch.commit();
        return {
            success: true,
            action,
            unreadDelta: unreadCount,
        };
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

    async updateNotificationStatus(userID, notificationID, status) {
        const notifRef = this.userCollection
            .doc(userID)
            .collection(NOTIFICATIONS_COLLECTION)
            .doc(notificationID);

        await notifRef.set({ status }, { merge: true });

        if (status === NOTIFICATION_STATUS.READ) {
            await this.userCollection.doc(userID).update({
                unreadNotificationCount: increment(-1),
                updatedAt: serverTimestamp,
            });
        }

        return { notificationID, status };
    }

    async softDeleteUser(userID) {
        await this.userCollection.doc(userID).update({
            isDeleted: true,
            deletedAt: serverTimestamp,
            disabled: true,
        });

        await auth.updateUser(userID, { disabled: true });
        sendUserDeleted(userID).catch((e) => console.log("Kafka sends failed"));
    }
}
