import crypto from "crypto";
import {
    AppError,
    ERROR_CODE,
    NOTIFICATION_STATUS,
    REDIS_TTL,
    ROLE,
} from "@event_ticket_booking_system/shared";
import { db, auth } from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user-status.enum.js";
import { sanitizeUserData } from "../utils/sanitize.js";
import {
    formatE164PhoneNumber,
    normalizeBirthday,
} from "../utils/formatter.js";

const NOTIFICATIONS_COLLECTION = "notifcations";
const ORGANIZERS_COLLECTION = "followedOrganizers";

export class UserService {
    constructor({ logger, redisService, redisLockService }) {
        this.logger = logger;
        this.userCollection = db.collection("users");
        this.cache = redisService;
        this.redisLockService = redisLockService;
    }

    // --- Helpers ---
    _getUserCacheKey(userID) {
        return `user:${userID}`;
    }

    _getUserByEmailCacheKey(email) {
        return `user:email:${email.toLowerCase()}`;
    }

    _getUsersListCacheKey(params) {
        const keyString = JSON.stringify(params);
        const hash = crypto
            .createHash("sha256")
            .update(keyString)
            .digest("hex");
        return `users:list:${hash}`;
    }

    async _createUserDoc(userID, userData) {
        try {
            const userRef = this.userCollection.doc(userID);
            await userRef.set(userData);
            this.logger.info(
                `[UserService] New user document created with ID: ${userID}`,
            );
            return userData;
        } catch (error) {
            this.logger.error(
                `[UserService] _createUserDoc error for userID ${userID}: ${error.message}`,
            );
            throw new AppError({
                message: "Failed to create user document in database.",
                errorCode: ERROR_CODE.DATABASE_ERROR,
                statusCode: 500,
                cause: error,
            });
        }
    }

    async _getUserDoc(userID) {
        try {
            const doc = await this.userCollection.doc(userID).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            this.logger.error(
                `[UserService] _getUserDoc error: ${error.message}`,
            );
            throw error;
        }
    }

    async _getUsersByIDsFromDB(userIDs) {
        if (!userIDs || userIDs.length === 0) {
            return [];
        }

        // Firestore 'in' query có giới hạn (thường là 30), chia nhỏ để đảm bảo an toàn
        const chunkSize = 30;
        const chunks = [];
        for (let i = 0; i < userIDs.length; i += chunkSize) {
            chunks.push(userIDs.slice(i, i + chunkSize));
        }

        try {
            const queryPromises = chunks.map((chunk) =>
                this.userCollection.where("userID", "in", chunk).get(),
            );

            const chunkSnapshots = await Promise.all(queryPromises);

            const users = [];
            for (const snapshot of chunkSnapshots) {
                snapshot.docs.forEach((doc) => {
                    users.push({ id: doc.id, ...doc.data() });
                });
            }
            return users;
        } catch (error) {
            this.logger.error(
                `[UserService] _getUsersByIDsFromDB error: ${error.message}`,
            );
            return []; // Trả về mảng rỗng nếu có lỗi
        }
    }

    async getUsers(params) {
        const {
            limit = 20,
            search,
            role = ROLE.CUSTOMER,
            status,
            isDeleted,
            lastVisibleValue,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = params;

        const canCache = !search && !lastVisibleValue;
        const listCacheKey = this._getUsersListCacheKey(params);

        let cachedListData;
        if (canCache) {
            cachedListData = await this.cache.get(listCacheKey);
        }

        let userIDs, nextCursor, hasMore;

        if (cachedListData) {
            // CACHE HIT cho danh sách
            this.logger.debug(
                `[Cache HIT] getUsers list with key: ${listCacheKey}`,
            );
            userIDs = cachedListData.ids;
            nextCursor = cachedListData.nextCursor;
            hasMore = cachedListData.hasMore;
        } else {
            // CACHE MISS cho danh sách: Truy vấn Firestore
            this.logger.debug(
                `[Cache MISS] getUsers list with key: ${listCacheKey}, fetching from DB...`,
            );
            let firebaseQuery = this.userCollection;

            // Xây dựng query như cũ
            if (role) firebaseQuery = firebaseQuery.where("role", "==", role);
            if (status)
                firebaseQuery = firebaseQuery.where("status", "==", status);
            if (isDeleted !== undefined) {
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
            if (lastVisibleValue) {
                firebaseQuery = firebaseQuery.startAfter(lastVisibleValue);
            }
            firebaseQuery = firebaseQuery.limit(Number(limit));

            const snapshot = await firebaseQuery.get();
            const docs = snapshot.docs;

            // Chỉ trích xuất ID từ kết quả
            userIDs = docs.map((doc) => doc.id);

            hasMore = docs.length === Number(limit);
            nextCursor = hasMore ? docs[docs.length - 1].get(sortBy) : null;

            // Lưu danh sách ID và thông tin phân trang vào cache
            if (canCache) {
                const listDataToCache = { ids: userIDs, nextCursor, hasMore };
                this.logger.debug(
                    `[Cache SET] getUsers list with key: ${listCacheKey}`,
                );
                await this.cache.set(
                    listCacheKey,
                    listDataToCache,
                    REDIS_TTL.USER_LIST,
                );
            }
        }

        if (!userIDs || userIDs.length === 0) {
            return { users: [], nextCursor: null, hasMore: false };
        }

        // --- Bước Hydrate: Lấy dữ liệu chi tiết bằng MGET ---
        const userCacheKeys = userIDs.map((id) => this._getUserCacheKey(id));
        let users = await this.cache.mget(userCacheKeys);

        // --- Bước Backfill: Tìm và lấy các user bị miss trong cache ---
        const missingUserIndices = [];
        users.forEach((user, index) => {
            if (user === null) {
                missingUserIndices.push(index);
            }
        });

        if (missingUserIndices.length > 0) {
            const missingUserIDs = missingUserIndices.map(
                (index) => userIDs[index],
            );
            this.logger.debug(
                `[Hydrate] ${missingUserIndices.length} users not in cache. Fetching IDs: ${missingUserIDs.join(", ")}`,
            );

            const missingUsersFromDB =
                await this._getUsersByIDsFromDB(missingUserIDs);

            const usersToCache = [];
            missingUsersFromDB.forEach((userFromDB) => {
                const originalIndex = userIDs.indexOf(userFromDB.id);
                if (originalIndex !== -1) {
                    users[originalIndex] = userFromDB; // Điền vào mảng kết quả
                    usersToCache.push([
                        this._getUserCacheKey(userFromDB.id),
                        userFromDB,
                    ]);
                }
            });

            // Cập nhật lại cache cho những user vừa lấy từ DB
            if (usersToCache.length > 0) {
                this.logger.debug(
                    `[Hydrate] Backfilling cache for ${usersToCache.length} users.`,
                );
                await this.cache.mset(
                    usersToCache,
                    REDIS_TTL.USER_PROFILE_DEFAULT,
                );
            }
        }

        // Lọc bỏ những user không thể lấy được (có thể đã bị xóa)
        users = users.filter((user) => user !== null);

        // Lưu ý: Filtering bằng `search` sau khi lấy dữ liệu không phải là cách tối ưu nhất.
        // Cách tốt nhất là dùng một dịch vụ search chuyên dụng như Algolia, MeiliSearch, or Elasticsearch.
        if (search) {
            const s = search.toLowerCase();
            users = users.filter((user) =>
                [user.usernameLowerCase, user.email].some((field) =>
                    field?.toLowerCase().includes(s),
                ),
            );
        }

        return { users, nextCursor, hasMore };
    }

    async findOrCreateUser(userID, userData) {
        const resourceKey = `user-find-create:${userID}`;

        try {
            return await this.redisLockService.executeWithLock(
                resourceKey,
                async () => {
                    const userCacheKey = this._getUserCacheKey(userID);
                    let user = await this.cache.get(userCacheKey);
                    if (user) {
                        this.logger.debug(
                            `[Cache HIT inside Lock] User found: ${userID}`,
                        );
                        return { user, isNew: false };
                    }

                    this.logger.debug(
                        `[DB Operation] Finding or creating user in DB: ${userID}`,
                    );

                    let isNew = false;
                    const finalUser = await db.runTransaction(
                        async (transaction) => {
                            const userRef = this.userCollection.doc(userID);
                            const userDoc = await transaction.get(userRef);
                            if (userDoc.exists) {
                                return { id: userDoc.id, ...userDoc.data() };
                            }
                            if (userData.email) {
                                const emailQuery = this.userCollection
                                    .where("email", "==", userData.email)
                                    .limit(1);
                                const querySnapshot =
                                    await transaction.get(emailQuery);
                                if (!querySnapshot.empty) {
                                    return {
                                        id: querySnapshot.docs[0].id,
                                        ...querySnapshot.docs[0].data(),
                                    };
                                }
                            }
                            isNew = true;
                            const newUser = {
                                userID,
                                status:
                                    userData.emailVerified ||
                                    userData.phoneVerified
                                        ? USER_STATUS.ACTIVE
                                        : USER_STATUS.UNVERIFIED,
                                email: userData.email,
                                role: ROLE.CUSTOMER,
                                isDeleted: false,
                                emailVerified: !!userData.emailVerified,
                                phoneVerified: !!userData.phoneVerified,
                                organizerStatus: ORGANIZER_STATUS.NONE,
                                reportCount: 0,
                                riskScore: 0,
                                preferenceCategories: [],
                                createdAt: new Date().toISOString(),
                                ...userData,
                            };
                            transaction.set(userRef, newUser);
                            return newUser;
                        },
                    );

                    await auth().setCustomUserClaims(finalUser.userID, {
                        role: finalUser.role,
                    });

                    this.logger.debug(
                        `[Cache SET] Caching user ${finalUser.userID}`,
                    );

                    const cachePromises = [];
                    cachePromises.push(
                        this.cache.set(
                            this._getUserCacheKey(finalUser.userID),
                            finalUser,
                        ),
                    );
                    if (finalUser.email) {
                        cachePromises.push(
                            this.cache.set(
                                this._getUserByEmailCacheKey(finalUser.email),
                                finalUser,
                            ),
                        );
                    }
                    await Promise.all(cachePromises);

                    return { user: finalUser, isNew };
                },
            );
        } catch (error) {
            // Xử lý lỗi đặc biệt khi không thể chiếm được khóa
            if (error.name === "LockAcquireFailedError") {
                this.logger.warn(
                    `[Lock] Could not acquire lock for user ${userID}, retrying operation...`,
                );
                // Nếu không có khóa, có nghĩa là một tiến trình khác đang xử lý.
                // Chiến lược tốt nhất là chờ một chút và thử lại toàn bộ hàm.
                await new Promise((resolve) => setTimeout(resolve, 200)); // Chờ 200ms
                return this.findOrCreateUser(userID, userData);
            }

            // Xử lý các lỗi khác
            this.logger.error(
                `[UserService] findOrCreateUser failed for userID ${userID}`,
                error,
            );
            throw new AppError({
                message: "Failed to find or create user.",
                errorCode: ERROR_CODE.INTERNAL_ERROR,
                statusCode: 500,
                cause: error,
            });
        }
    }

    async checkUserExists(userID) {
        const doc = await this.userCollection.doc(userID).get();
        return doc.exists && !doc.data()?.isDeleted;
    }

    async getUserByID(userID) {
        const key = this._getUserCacheKey(userID);
        const ttl = REDIS_TTL.USER_PROFILE_DEFAULT;

        return await this.cache.getOrSet(
            key,
            async () => {
                const doc = await this.userCollection.doc(userID).get();

                if (!doc.exists) {
                    return null;
                }

                return { id: doc.id, ...doc.data() };
            },
            ttl,
        );
    }

    async getUserByEmail(email) {
        return await this.cache.getOrSet(
            this._getUserByEmailCacheKey(email),
            REDIS_TTL.USER_PROFILE_DEFAULT,
            async () => {
                const querySnapshot = await this.userCollection
                    .where("email", "==", email)
                    .limit(1)
                    .get();

                if (querySnapshot.empty) return null;

                const userDoc = querySnapshot.docs[0];
                const userData = { id: userDoc.id, ...userDoc.data() };

                await this.cache.set(
                    this._getUserCacheKey(userData.id),
                    userData,
                    REDIS_TTL.USER_PROFILE,
                );

                return userData;
            },
        );
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

            user.usernameLowerCase = user.username.toLowerCase();
            if (user.birthday) {
                user.birthday = new Date(user.birthday);
            }
            user.createdAt = new Date().toISOString();
            user.followedOrganizersCount = 0;
            user.unreadNotificationCount = 0;

            const userID = user.userID || this.userCollection.doc().id;
            const userRef = this.userCollection.doc(userID);

            const newUser = { ...user, userID };
            transaction.set(userRef, newUser);
            await auth().setCustomUserClaims(userID, {
                role: newUser.role,
            });

            await this.cache.set(
                this._getUserCacheKey(userID),
                newUser,
                REDIS_TTL.USER_PROFILE_DEFAULT,
            );

            await this.cache.set(
                this._getUserByEmailCacheKey(user.email),
                newUser,
                REDIS_TTL.USER_PROFILE_DEFAULT,
            );

            return { success: true, data: newUser };
        });
    }

    async updateUser(userID, updateData) {
        const resourceKey = `user-update:${userID}`;

        try {
            const updatedUser = await this.lockService.executeWithLock(
                resourceKey,
                async () => {
                    const currentUser = await this._getUserDoc(userID);
                    if (!currentUser) {
                        throw new AppError({
                            message: "User not found",
                            statusCode: 404,
                        });
                    }

                    if (updateData.birthday) {
                        updateData.birthday = normalizeBirthday(
                            updateData.birthday,
                        );
                    }

                    const updatePayload = {
                        ...updateData,
                        updatedAt: new Date().toISOString(),
                    };

                    const userRef = this.userCollection.doc(userID);
                    await userRef.update(updatePayload);

                    const updateAuthPayload = {};
                    if (updateData.username)
                        updateAuthPayload.displayName = updateData.username;
                    if (updateData.photoUrl)
                        updateAuthPayload.photoURL = updateData.photoUrl;
                    if (updateData.email)
                        updateAuthPayload.email = updateData.email;
                    if (updateData.phoneNumber) {
                        updateAuthPayload.phoneNumber = formatE164PhoneNumber(
                            updateData.phoneNumber,
                        );
                    }

                    if (Object.keys(updateAuthPayload).length > 0) {
                        await auth().updateUser(userID, updateAuthPayload);
                    }

                    this.logger.debug(
                        `[Cache Invalidate] Invalidating cache for user ${userID}`,
                    );

                    await this.cache.invalidateByTrackingKey(
                        `user:${userID}:cache_keys`,
                    );

                    const finalUserData = await this._getUserDoc(userID);
                    return finalUserData;
                },
            );

            return { success: true, data: updatedUser };
        } catch (error) {
            if (error.name === "LockAcquireFailedError") {
                this.logger.warn(
                    `[Lock] Could not acquire lock for user update ${userID}.`,
                );
                throw new AppError({
                    message:
                        "User data is currently being updated. Please try again in a moment.",
                    statusCode: 409, // 409 Conflict là một mã trạng thái tốt
                    cause: error,
                });
            }

            this.logger.error(`[updateUser] ERROR for user ${userID}:`, error);
            throw error;
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
                        followedAt: new Date().toISOString(),
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
            updatedAt: new Date().toISOString(),
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
                notifData.createdAt = new Date().toISOString();
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
                updatedAt: new Date().toISOString(),
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
                updatedAt: new Date().toISOString(),
            });
        }

        return { notificationID, status };
    }

    async softDeleteUser(userID) {
        await this.userCollection.doc(userID).update({
            isDeleted: true,
            deletedAt: new Date().toISOString(),
        });

        const user = await this._getUserDoc(userID);
        if (user && user.email) {
            await this.cache.del([
                this._getUserCacheKey(userID),
                this._getUserByEmailCacheKey(user.email),
            ]);
        }

        await auth.updateUser(userID, { disabled: true });
        // sendUserDeleted({ userID, deleteType: "soft" }).catch((e) =>
        //     console.log("Kafka sends failed: ", e),
        // );
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

        const user = await this._getUserDoc(userID);
        if (user && user.email) {
            await this.cache.del([
                this._getUserCacheKey(userID),
                this._getUserByEmailCacheKey(user.email),
            ]);
        }

        await userRef.delete();
        await auth.deleteUser(userID);
        // sendUserDeleted({ userID, deleteType: "hard" }).catch((e) =>
        //     console.log("Kafka sends failed: ", e),
        // );

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
            .filter((u) => [USER_STATUS.ACTIVE].includes(u.status))
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
