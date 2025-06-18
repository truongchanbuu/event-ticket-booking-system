import {
    AppError,
    ERROR_CODE,
    NOTIFICATION_STATUS,
    ROLE,
} from "@event_ticket_booking_system/shared";
import { db, serverTimestamp, increment, auth } from "../firebase-emulator.js"; // TODO: Test only
import { sendUserDeleted } from "../kafka/user.event.js";
import { USER_STATUS } from "../enums/user_status.enum.js";
import { sanitizeUserData } from "../utils/sanitize.js";

const NOTIFICATIONS_COLLECTION = "notifcations";
const ORGANIZERS_COLLECTION = "followedOrganizers";
export default class UserService {
    constructor({ logger }) {
        this.logger = logger;
        this.userCollection = db.collection("users");
    }

    // User
    async getUsers({
        limit = 20,
        search,
        role = ROLE.CUSTOMER,
        status,
        isDeleted,
        lastVisibleValue,
        sortBy = "createdAt",
        sortOrder = "desc",
    }) {
        let firebaseQuery = this.userCollection;

        if (role) firebaseQuery = firebaseQuery.where("role", "==", role);
        if (status) firebaseQuery = firebaseQuery.where("status", "==", status);
        if (isDeleted) {
            firebaseQuery = firebaseQuery.where(
                "isDeleted",
                "==",
                isDeleted === "true" || isDeleted === true,
            );
        }

        firebaseQuery = firebaseQuery.orderBy(
            sortBy,
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
                ? snapshot.docs[snapshot.docs.length - 1].get(sortBy)
                : null;

        return {
            users: filteredUsers,
            nextCursor,
            hasMore: snapshot.docs.length === limit,
        };
    }

    async getUserByID(userID) {
        const doc = await this.userCollection.doc(userID).get();

        if (!doc.exists) {
            throw new AppError({
                message: "User not found",
                errorCode: ERROR_CODE.NOT_FOUND,
                statusCode: 404,
            });
        }

        const user = { id: doc.id, ...doc.data() };

        if (user.isDeleted) {
            throw new AppError({
                message: "This user account is not available",
                errorCode: ERROR_CODE.USER_DELETED,
                statusCode: 403,
            });
        }

        return user;
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
        });

        await auth.updateUser(userID, { disabled: true });
        sendUserDeleted({ userID, deleteType: "soft" }).catch((e) =>
            console.log("Kafka sends failed: ", e),
        );
    }

    async hardDeleteUser(userID) {
        const userRef = this.userCollection.doc(userID);

        const subcollections = [
            ORGANIZERS_COLLECTION,
            NOTIFICATIONS_COLLECTION,
        ];

        for (const sub of subcollections) {
            const subColRef = userRef.collection(sub);
            const snapshot = await subColRef.get();

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        await userRef.delete();

        await auth.deleteUser(userID);

        sendUserDeleted({ userID, deleteType: "hard" }).catch((e) =>
            console.log("Kafka sends failed: ", e),
        );

        return { success: true, deletedUserID: userID };
    }

    async getPublicOrganizers(query) {
        const enrichedQuery = {
            ...query,
            role: ROLE.EVENT_ORGANIZER,
            isDeleted: false,
        };

        const result = await this.getUsers(enrichedQuery);

        const organizers = result.users
            .filter((u) =>
                [USER_STATUS.ACTIVE, USER_STATUS.VERIFIED].includes(u.status),
            )
            .map((u) => sanitizeUserData(u, false));

        return {
            organizers,
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
        };
    }

    async getOrganizerProfile(orgID) {
        const user = await this.getUserByID(orgID);
        return sanitizeUserData(user, false);
    }
}
