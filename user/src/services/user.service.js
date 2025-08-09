import crypto from "crypto";
import {
    AppError,
    ERROR_CODE,
    NOTIFICATION_STATUS,
    REDIS_TTL,
    ROLE,
    db,
    auth,
    ORGANIZER_STATUS,
    FieldValue,
} from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user-status.enum.js";
import { sanitizeUserData } from "../utils/sanitize.js";
import {
    formatE164PhoneNumber,
    normalizeBirthday,
} from "../utils/formatter.js";

// Collections
const NOTIFICATIONS_COLLECTION = "notifications"; // fixed typo
const ORGANIZERS_COLLECTION = "followedOrganizers";

/**
 * Redis-aware, Firestore-backed user service with:
 * - Read-through + write-through caching
 * - Optional Redis lock for write hot-spots (create/update)
 * - Consistent cache keying + invalidation
 */
export class UserService {
    /**
     * @param {object} deps
     * @param {Console|any} deps.logger
     * @param {import("../infra/redis.service").RedisService} deps.redisService
     * @param {import("../infra/redis-lock.service").RedisLockService} [deps.redisLockService]
     */
    constructor({ logger, redisService, redisLockService }) {
        this.logger = logger ?? console;
        this.userCollection = db.collection("users");
        this.cache = redisService;
        this.redisLockService = redisLockService; // optional but recommended for hot writes
    }

    // ---------------- Key builders ----------------
    _keyUser(id) {
        return `user:${id}`;
    }

    _keyUserByEmail(email) {
        return `user:email:${email.toLowerCase()}`;
    }

    _keyUserList(params) {
        const keyString = JSON.stringify(params);
        const hash = crypto
            .createHash("sha256")
            .update(keyString)
            .digest("hex");
        return `users:list:${hash}`;
    }

    // ---------------- Low-level helpers ----------------
    async _getUserDoc(userID) {
        const snap = await this.userCollection.doc(userID).get();
        return snap.exists ? { id: snap.id, ...snap.data() } : null;
    }

    async _getUsersByIDsFromDB(userIDs) {
        if (!userIDs?.length) return [];

        const chunkSize = 30; // Firestore `in` query limit safety
        const chunks = [];
        for (let i = 0; i < userIDs.length; i += chunkSize)
            chunks.push(userIDs.slice(i, i + chunkSize));

        const snapshots = await Promise.all(
            chunks.map((ids) =>
                this.userCollection.where("userID", "in", ids).get(),
            ),
        );

        const users = [];
        for (const s of snapshots) {
            s.docs.forEach((d) => users.push({ id: d.id, ...d.data() }));
        }
        return users;
    }

    // ---------------- Queries ----------------
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
        } = params ?? {};

        const canCache = !search && !lastVisibleValue;
        const listKey = this._keyUserList({
            limit,
            role,
            status,
            isDeleted,
            sortBy,
            sortOrder,
        });

        let userIDs, nextCursor, hasMore;

        if (canCache) {
            const cached = await this.cache.get(listKey);
            if (cached) {
                this.logger.debug(`[Cache HIT] user list: ${listKey}`);
                ({ ids: userIDs, nextCursor, hasMore } = cached);
            }
        }

        if (!userIDs) {
            this.logger.debug(`[Cache MISS] user list: ${listKey}`);
            let q = this.userCollection;
            if (role) q = q.where("role", "==", role);
            if (status) q = q.where("status", "==", status);
            if (isDeleted !== undefined)
                q = q.where(
                    "isDeleted",
                    "==",
                    isDeleted === true || isDeleted === "true",
                );
            q = q.orderBy(sortBy, sortOrder === "asc" ? "asc" : "desc");
            if (lastVisibleValue) q = q.startAfter(lastVisibleValue);
            q = q.limit(Number(limit));

            const snap = await q.get();
            const docs = snap.docs;
            userIDs = docs.map((d) => d.id);
            hasMore = docs.length === Number(limit);
            nextCursor = hasMore ? docs[docs.length - 1].get(sortBy) : null;

            if (canCache) {
                await this.cache.set(
                    listKey,
                    { ids: userIDs, nextCursor, hasMore },
                    REDIS_TTL.USER_LIST,
                );
            }
        }

        if (!userIDs.length)
            return { users: [], nextCursor: null, hasMore: false };

        // Hydrate from cache first
        const keys = userIDs.map((id) => this._keyUser(id));
        let users = await this.cache.mget(keys);

        // Backfill misses
        const missingIdx = [];
        users.forEach((u, i) => u == null && missingIdx.push(i));

        if (missingIdx.length) {
            const missingIDs = missingIdx.map((i) => userIDs[i]);
            this.logger.debug(
                `[Hydrate] ${missingIDs.length} user cache misses. Fetching from DB.`,
            );
            const fromDB = await this._getUsersByIDsFromDB(missingIDs);

            const toCache = [];
            fromDB.forEach((u) => {
                const i = userIDs.indexOf(u.id);
                if (i !== -1) {
                    users[i] = u;
                    toCache.push([this._keyUser(u.id), u]);
                }
            });
            if (toCache.length)
                await this.cache.mset(toCache, REDIS_TTL.USER_PROFILE_DEFAULT);
        }

        users = users.filter(Boolean);

        if (search) {
            const s = String(search).toLowerCase();
            users = users.filter((u) =>
                [u.usernameLowerCase, u.email].some((f) =>
                    f?.toLowerCase().includes(s),
                ),
            );
        }

        return { users, nextCursor, hasMore };
    }

    async getUserByID(userID) {
        const key = this._keyUser(userID);
        const ttl = REDIS_TTL.USER_PROFILE_DEFAULT;
        // Adjust the signature to your RedisService implementation
        return await this.cache.getOrSet(
            key,
            async () => await this._getUserDoc(userID),
            ttl,
        );
    }

    async getUserByEmail(email) {
        const key = this._keyUserByEmail(email);
        const ttl = REDIS_TTL.USER_PROFILE_DEFAULT;
        return await this.cache.getOrSet(
            key,
            async () => {
                const snap = await this.userCollection
                    .where("email", "==", email)
                    .limit(1)
                    .get();
                if (snap.empty) return null;
                const doc = snap.docs[0];
                const data = { id: doc.id, ...doc.data() };
                await this.cache.set(this._keyUser(data.id), data, ttl);
                return data;
            },
            ttl,
        );
    }

    // ---------------- Commands ----------------
    async findOrCreateUser(userID, userData) {
        const tryFind = async () => {
            const c = await this.cache.get(this._keyUser(userID));
            if (c) return { user: c, isNew: false };

            const byId = await this._getUserDoc(userID);
            if (byId) return { user: byId, isNew: false };

            if (userData.email) {
                const byEmail = await this.getUserByEmail(userData.email);
                if (byEmail) return { user: byEmail, isNew: false };
            }

            return null;
        };

        const found = await tryFind();
        if (found) return found;

        const lockKey = userData.email
            ? `user-create-email:${userData.email.toLowerCase()}`
            : `user-create-id:${userID}`;

        const createFlow = async () => {
            const again = await tryFind();
            if (again) return again;

            let isNew = false;
            const finalUser = await db.runTransaction(async (tx) => {
                const ref = this.userCollection.doc(userID);
                const doc = await tx.get(ref);
                if (doc.exists) return { id: doc.id, ...doc.data() };

                // (tuỳ chọn) unique email bằng collection emails/
                if (userData.email) {
                    const emailDoc = db
                        .collection("emails")
                        .doc(userData.email.toLowerCase());
                    const emailSnap = await tx.get(emailDoc);
                    if (emailSnap.exists) {
                        const mappedId = emailSnap.get("userID");
                        const mapped = await tx.get(
                            this.userCollection.doc(mappedId),
                        );
                        if (mapped.exists)
                            return { id: mapped.id, ...mapped.data() };
                    } else {
                        // Nếu dùng Admin SDK hỗ trợ create: tx.create(emailDoc, { userID });
                        tx.set(emailDoc, { userID, createdAt: Date.now() });
                    }
                }

                isNew = true;
                const payload = {
                    userID,
                    email: userData.email ?? null,
                    role: ROLE.CUSTOMER,
                    status:
                        userData.emailVerified || userData.phoneVerified
                            ? USER_STATUS.ACTIVE
                            : USER_STATUS.UNVERIFIED,
                    isDeleted: false,
                    emailVerified: !!userData.emailVerified,
                    phoneVerified: !!userData.phoneVerified,
                    organizerStatus: ORGANIZER_STATUS.NONE,
                    reportCount: 0,
                    riskScore: 0,
                    preferenceCategories: [],
                    usernameLowerCase: userData.username?.toLowerCase(),
                    createdAt: new Date().toISOString(),
                    ...userData,
                };
                tx.set(ref, payload);
                return payload;
            });

            await auth().setCustomUserClaims(finalUser.userID, {
                role: finalUser.role,
            });

            await this.cache.set(
                this._keyUser(finalUser.userID),
                finalUser,
                REDIS_TTL.USER_PROFILE_DEFAULT,
            );
            if (finalUser.email) {
                await this.cache.set(
                    this._keyUserByEmail(finalUser.email),
                    finalUser,
                    REDIS_TTL.USER_PROFILE_DEFAULT,
                );
            }
            return { user: finalUser, isNew };
        };

        if (!this.redisLockService) return await createFlow();
        return await this.redisLockService.executeWithLock(lockKey, createFlow);
    }

    async createUser(user) {
        return await db.runTransaction(async (tx) => {
            const exists = await tx.get(
                this.userCollection.where("email", "==", user.email).limit(1),
            );
            if (!exists.empty) {
                throw new AppError({
                    message: "Email already exists",
                    statusCode: 400,
                    errorCode: "EMAIL_EXISTS",
                });
            }

            const userID = user.userID || this.userCollection.doc().id;
            const ref = this.userCollection.doc(userID);
            const payload = {
                ...user,
                userID,
                usernameLowerCase: user.username?.toLowerCase(),
                birthday: user.birthday ? new Date(user.birthday) : undefined,
                followedOrganizersCount: 0,
                unreadNotificationCount: 0,
                createdAt: new Date().toISOString(),
            };
            tx.set(ref, payload);

            await auth().setCustomUserClaims(userID, { role: payload.role });
            await this.cache.set(
                this._keyUser(userID),
                payload,
                REDIS_TTL.USER_PROFILE_DEFAULT,
            );
            if (payload.email)
                await this.cache.set(
                    this._keyUserByEmail(payload.email),
                    payload,
                    REDIS_TTL.USER_PROFILE_DEFAULT,
                );

            return { success: true, data: payload };
        });
    }

    async updateUser(userID, updateData) {
        const resourceKey = `user-update:${userID}`;
        const doWork = async () => {
            const current = await this._getUserDoc(userID);
            if (!current)
                throw new AppError({
                    message: "User not found",
                    statusCode: 404,
                });

            const patch = { ...updateData };
            if (patch.birthday)
                patch.birthday = normalizeBirthday(patch.birthday);
            patch.updatedAt = new Date().toISOString();

            const ref = this.userCollection.doc(userID);
            await ref.update(patch);

            const authPatch = {};
            if (patch.username) authPatch.displayName = patch.username;
            if (patch.photoUrl) authPatch.photoURL = patch.photoUrl;
            if (patch.email) authPatch.email = patch.email;
            if (patch.phoneNumber)
                authPatch.phoneNumber = formatE164PhoneNumber(
                    patch.phoneNumber,
                );
            if (Object.keys(authPatch).length)
                await auth().updateUser(userID, authPatch);

            // Cache invalidate -> then set fresh snapshot
            const fresh = await this._getUserDoc(userID);
            await this.cache.mdel([
                this._keyUser(userID),
                ...(fresh?.email ? [this._keyUserByEmail(fresh.email)] : []),
            ]);
            await this.cache.set(
                this._keyUser(userID),
                fresh,
                REDIS_TTL.USER_PROFILE_DEFAULT,
            );
            if (fresh?.email)
                await this.cache.set(
                    this._keyUserByEmail(fresh.email),
                    fresh,
                    REDIS_TTL.USER_PROFILE_DEFAULT,
                );

            return { success: true, data: fresh };
        };

        if (!this.redisLockService) return await doWork();

        try {
            return await this.redisLockService.executeWithLock(
                resourceKey,
                doWork,
            );
        } catch (err) {
            if (err?.name === "LockAcquireFailedError") {
                throw new AppError({
                    message:
                        "User data is currently being updated. Please try again in a moment.",
                    statusCode: 409,
                    cause: err,
                });
            }
            this.logger.error(`[updateUser] ERROR for user ${userID}:`, err);
            throw err;
        }
    }

    async checkUserExists(userID) {
        const doc = await this.userCollection.doc(userID).get();
        return doc.exists && !doc.data()?.isDeleted;
    }

    async updateFollowedOrganizers(userID, organizers, action = "follow") {
        const userRef = this.userCollection.doc(userID);
        const batch = db.batch();

        for (const org of organizers) {
            const orgRef = userRef
                .collection(ORGANIZERS_COLLECTION)
                .doc(org.orgID);
            if (action === "follow") {
                batch.set(
                    orgRef,
                    { ...org, followedAt: new Date().toISOString() },
                    { merge: true },
                );
            } else if (action === "unfollow") {
                batch.delete(orgRef);
            }
        }

        const delta =
            action === "follow" ? organizers.length : -organizers.length;
        if (delta !== 0) {
            batch.update(userRef, {
                followedOrganizersCount: FieldValue.increment(delta),
                updatedAt: new Date().toISOString(),
            });
        }

        await batch.commit();
        return organizers.length;
    }

    async updateNotifications(userID, notifications, action = "create") {
        const batch = db.batch();
        const userRef = this.userCollection.doc(userID);
        const notifCol = userRef.collection(NOTIFICATIONS_COLLECTION);

        let unreadDelta = 0;

        for (const notif of notifications) {
            const id = notif.notificationID || notifCol.doc().id;
            const ref = notifCol.doc(id);
            const status = notif.status || NOTIFICATION_STATUS.UNREAD;

            if (action === "delete") {
                batch.delete(ref);
                if (status === NOTIFICATION_STATUS.UNREAD) unreadDelta--;
                continue;
            }

            const data = { ...notif, notificationID: id, status };
            if (action === "create") {
                data.createdAt = new Date().toISOString();
                if (status === NOTIFICATION_STATUS.UNREAD) unreadDelta++;
                batch.set(ref, data);
            } else if (action === "update") {
                if (status === NOTIFICATION_STATUS.UNREAD) unreadDelta++;
                if (status === NOTIFICATION_STATUS.READ) unreadDelta--;
                batch.set(ref, data, { merge: true });
            }
        }

        if (unreadDelta !== 0) {
            batch.update(userRef, {
                unreadNotificationCount: FieldValue.increment(unreadDelta),
                updatedAt: new Date().toISOString(),
            });
        }

        await batch.commit();
        return { success: true, action, unreadDelta };
    }

    async updateNotificationStatus(userID, notificationID, status) {
        const notifRef = this.userCollection
            .doc(userID)
            .collection(NOTIFICATIONS_COLLECTION)
            .doc(notificationID);
        await notifRef.set({ status }, { merge: true });

        if (status === NOTIFICATION_STATUS.READ) {
            await this.userCollection.doc(userID).update({
                unreadNotificationCount: FieldValue.increment(-1),
                updatedAt: new Date().toISOString(),
            });
        }

        return { notificationID, status };
    }

    async softDeleteUser(userID) {
        await this.userCollection
            .doc(userID)
            .update({ isDeleted: true, deletedAt: new Date().toISOString() });

        const user = await this._getUserDoc(userID);
        if (user?.email)
            await this.cache.mdel([
                this._keyUser(userID),
                this._keyUserByEmail(user.email),
            ]);
        else await this.cache.del(this._keyUser(userID));

        await auth().updateUser(userID, { disabled: true });
    }

    async hardDeleteUser(userID) {
        const userRef = this.userCollection.doc(userID);

        // delete subcollections (best-effort; for big data you may want a Cloud Function / export + delete)
        for (const sub of [ORGANIZERS_COLLECTION, NOTIFICATIONS_COLLECTION]) {
            const snap = await userRef.collection(sub).get();
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }

        const user = await this._getUserDoc(userID);
        if (user?.email)
            await this.cache.mdel([
                this._keyUser(userID),
                this._keyUserByEmail(user.email),
            ]);
        else await this.cache.del(this._keyUser(userID));

        await userRef.delete();
        await auth().deleteUser(userID);
        return { success: true, deletedUserID: userID };
    }

    // -------- Public read models for organizers --------
    async getPublicOrganizers(query) {
        const enriched = {
            ...query,
            role: ROLE.EVENT_ORGANIZER,
            isDeleted: false,
        };
        const { users, nextCursor, hasMore } = await this.getUsers(enriched);
        const organizers = users
            .filter((u) => [USER_STATUS.ACTIVE].includes(u.status))
            .map((u) => sanitizeUserData(u, false));
        return { organizers, nextCursor, hasMore };
    }

    async getOrganizerProfile(orgID) {
        const user = await this.getUserByID(orgID);
        return sanitizeUserData(user, false);
    }
}
