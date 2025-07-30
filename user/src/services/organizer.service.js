import {
    AppError,
    APPLY_STATUS,
    ERROR_CODE,
    ORGANIZER_STATUS,
    db,
    REDIS_TTL,
} from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user-status.enum.js";
import {
    ADMIN_APPROVAL_THRESHOLDS,
    COOLDOWN_CONSTANTS,
} from "../config/constants.js";
import { REVIEWER } from "../enums/reviewer.js";

const ORG_APPLICATION_COLLECTION = "orgApplications";
const USER_COLLECTION = "users";
const LIMIT_APPLY = 5;

export default class OrganizerService {
    constructor({ logger, redisService }) {
        this.logger = logger;
        this.redisService = redisService;
        this.userCollection = db.collection(USER_COLLECTION);
        this.orgCollection = db.collection(ORG_APPLICATION_COLLECTION);
        this.LIMIT_APPLY = LIMIT_APPLY;
    }

    _getAppCacheKey(appID) {
        return `org-app:${appID}`;
    }

    _getUserAppsCacheKey(userID, options) {
        const { orderBy = "desc", sortBy = "submittedAt" } = options;
        return `user-apps:${userID}:${sortBy}:${orderBy}`;
    }

    async getAllApplications(options = {}) {
        const {
            limit = 20,
            status,
            search,
            lastVisibleValue,
            sortBy = "submittedAt",
            sortOrder = "desc",
            minRejectCount,
            maxRejectCount,
            hasCooldown,
            requiresAdminApproval,
            userID,
            dateFrom,
            dateTo,
        } = options;

        const safeLimit = Math.min(Math.max(limit, 1), 100);

        let q = this.orgCollection;

        if (status) {
            q = q.where("status", "==", status);
        }

        if (userID) {
            q = q.where("userID", "==", userID);
        }

        if (dateFrom) {
            q = q.where("submittedAt", ">=", dateFrom);
        }

        if (dateTo) {
            q = q.where("submittedAt", "<=", dateTo);
        }

        q = q.orderBy(sortBy, sortOrder);

        if (lastVisibleValue) {
            q = q.startAfter(lastVisibleValue);
        }

        const querySnapshot = await q.limit(safeLimit).get();

        let applications = [];
        let lastDocument = null;

        querySnapshot.forEach((doc) => {
            applications.push(doc.data());
            lastDocument = doc;
        });

        if (maxRejectCount) {
            applications = applications.filter(
                (app) => (app.rejectCount || 0) <= maxRejectCount,
            );
        }

        if (minRejectCount) {
            applications = applications.filter(
                (app) => (app.rejectCount || 0) >= minRejectCount,
            );
        }

        if (requiresAdminApproval) {
            applications = applications.filter(
                (app) =>
                    Boolean(app.requiresAdminApproval) ===
                    requiresAdminApproval,
            );
        }

        if (hasCooldown) {
            const now = new Date();
            if (hasCooldown) {
                applications = applications.filter(
                    (app) =>
                        app.cooldownUntil &&
                        new Date(app.cooldownUntil.toDate()) > now,
                );
            }
        }

        if (search?.trim() !== "") {
            applications = this._filterApplicationsBySearch(
                applications,
                search?.trim(),
            );

            if (applications.length > safeLimit) {
                applications = applications.slice(0, safeLimit);
            }
        }

        const hasMore = querySnapshot.size === safeLimit;

        return {
            applications,
            lastVisibleValue: lastDocument,
            hasMore,
            count: applications.length,
        };
    }

    async getApplicationByAppID(appID) {
        const cacheKey = this._getAppCacheKey(appID);

        return this.redisService.getOrSet(
            cacheKey,
            async () => {
                this.logger?.log(
                    `[DB Read] Fetching application ${appID} from Firestore.`,
                );
                const applicationSnap = await this.orgCollection
                    .doc(appID)
                    .get();

                if (!applicationSnap.exists) {
                    return null;
                }

                console.log(
                    `[DB GET] - db got: ${JSON.stringify(applicationSnap)}`,
                );
                return applicationSnap.data();
            },
            REDIS_TTL.ORGANIZER_APP,
        );
    }

    /**
     * Lấy danh sách các đơn đăng ký của một người dùng cụ thể.
     * @param {string} userID - ID của người dùng.
     * @param {object} options - Các tùy chọn truy vấn.
     * @param {'asc' | 'desc'} [options.orderBy="desc"] - Hướng sắp xếp.
     * @param {string} [options.sortBy="submittedAt"] - Trường để sắp xếp (sử dụng submittedAt thay vì createdAt để rõ nghĩa hơn).
     * @returns {Promise<Array<Object>>} Một mảng các đơn đăng ký, mỗi đơn có cả ID.
     */
    async getApplicationsByUserID(userID, options = {}) {
        const cacheKey = this._getUserAppsCacheKey(userID, options);

        return this.redisService.getOrSet(
            cacheKey,
            async () => {
                this.logger?.log(
                    `[DB Read] Fetching applications for user ${userID} from Firestore.`,
                );
                const { orderBy = "desc", sortBy = "submittedAt" } = options;
                const applicationSnap = await this.orgCollection
                    .where("userID", "==", userID)
                    .orderBy(sortBy, orderBy)
                    .get();

                if (applicationSnap.empty) {
                    return []; // Cache một mảng rỗng là hoàn toàn ổn
                }
                return applicationSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
            },
            REDIS_TTL.USER_APPS_LIST,
        );
    }

    async canApplyOrganizer(userID) {
        try {
            this.logger?.log(`[canApplyOrganizer] Checking user ${userID}`);

            const userSnap = await this.userCollection.doc(userID).get();
            if (!userSnap.exists) {
                this.logger?.log(
                    `[canApplyOrganizer] User not found: ${userID}`,
                );
                return {
                    canApply: false,
                    reason: "User not found.",
                    errorCode: ERROR_CODE.USER_NOT_FOUND,
                };
            }

            const user = userSnap.data();
            this.logger?.log(`[canApplyOrganizer] User data:`, user);

            // Check if account is deleted
            if (user?.isDeleted || user?.deletedAt) {
                return {
                    canApply: false,
                    reason: "Account has been disabled.",
                    errorCode: ERROR_CODE.ACCOUNT_DISABLED,
                };
            }

            // Check invalid user statuses
            const blockedUserStatuses = {
                [USER_STATUS.BANNED]: "Account has been banned permanently.",
                [USER_STATUS.SUSPENDED]: "Account is temporarily suspended.",
                [USER_STATUS.INACTIVE]: "Account is not active.",
                [USER_STATUS.PENDING]: "Account is not active.",
                [USER_STATUS.UNVERIFIED]: "Account is not active.",
            };

            if (user?.status !== USER_STATUS.ACTIVE) {
                return {
                    canApply: false,
                    reason:
                        blockedUserStatuses[user.status] ||
                        "Account cannot be used.",
                    requireAdminApproval: user?.status === USER_STATUS.BANNED,
                    errorCode: ERROR_CODE.INVALID_ACCOUNT_STATUS,
                };
            }

            // Already an organizer
            if (user?.organizerStatus === ORGANIZER_STATUS.APPROVED) {
                return {
                    canApply: false,
                    reason: "You are already an organizer.",
                    errorCode: ERROR_CODE.ALREADY_ORGANIZER,
                };
            }

            // Check existing applications
            const applications = await this.getApplicationsByUserID(userID);
            this.logger?.log(
                `[canApplyOrganizer] Found ${applications.length} applications`,
            );

            if (applications.length > 0) {
                const BLOCKED_STATUSES = [
                    APPLY_STATUS.PENDING,
                    APPLY_STATUS.PENDING_ADMIN,
                    APPLY_STATUS.PROCESSING,
                    APPLY_STATUS.EDITING,
                    APPLY_STATUS.LOCKED_BY_ADMIN,
                ];

                const blockingApp = applications.find((app) =>
                    BLOCKED_STATUSES.includes(app.status),
                );

                if (blockingApp) {
                    return {
                        canApply: false,
                        reason: "You already have an ongoing application. Please wait for it to be processed.",
                        errorCode: ERROR_CODE.PENDING_APPLICATION,
                        blockingStatus: blockingApp.status,
                    };
                }

                const latestApp = applications[0];
                if (latestApp.status === APPLY_STATUS.PERMANENT_REJECTED) {
                    return {
                        canApply: false,
                        reason: "Your account has been permanently restricted from applying.",
                        requireAdminApproval: true,
                        errorCode: ERROR_CODE.PERMANENT_REJECTED,
                    };
                }

                if (applications.length > this.LIMIT_APPLY) {
                    return {
                        canApply: false,
                        reason: "You have exceeded the maximum number of applications allowed.",
                        requireAdminApproval: true,
                        errorCode: ERROR_CODE.TOO_MANY_APPLICATIONS,
                    };
                }

                const cooldownResult = this.checkCooldownPeriod(applications);
                if (!cooldownResult.canApply) {
                    return {
                        ...cooldownResult,
                        errorCode: ERROR_CODE.COOLDOWN_PERIOD,
                    };
                }

                const adminApprovalResult = this.checkAdminApprovalRequired(
                    applications,
                    user,
                );

                if (adminApprovalResult.requiresAdminApproval) {
                    return {
                        canApply: false,
                        reason: "Your application requires admin approval. Please contact support.",
                        requireAdminApproval: true,
                        errorCode: ERROR_CODE.REQUIRES_ADMIN_APPROVAL,
                        ...adminApprovalResult,
                    };
                }
            }

            return {
                canApply: true,
                message: "You can apply to become an organizer.",
                user,
                applications,
            };
        } catch (error) {
            this.logger?.error("Error in canApplyOrganizer:", error);
            return {
                canApply: false,
                reason: "System error. Please try again later.",
                errorCode: ERROR_CODE.INTERNAL_ERROR,
            };
        }
    }

    async createApplication(applicationData) {
        const userID = applicationData.userID;

        this.logger?.log(`[createApplication] Start for user: ${userID}`);

        const canApplyResult = await this.canApplyOrganizer(userID);
        this.logger?.log(
            `[createApplication] canApply result:`,
            canApplyResult,
        );

        if (!canApplyResult.canApply) {
            throw new AppError({
                message: canApplyResult.reason,
                statusCode: 403,
                errorCode: canApplyResult.errorCode,
            });
        }

        const { user, applications } = canApplyResult;

        const adminApprovalCheck = this.checkAdminApprovalRequired(
            applications,
            user,
        );

        this.logger?.log(
            `[createApplication] Admin approval check:`,
            adminApprovalCheck,
        );

        const applicationID = `oa_${Date.now()}_${userID.slice(-4)}`;

        const initialStatus = adminApprovalCheck.requiresAdminApproval
            ? APPLY_STATUS.PENDING_ADMIN
            : APPLY_STATUS.PENDING;

        const newApplication = {
            ...applicationData,
            applicationID,
            status: initialStatus,
            submittedAt: new Date().toISOString(),
            moderation: {
                rejectionReason: adminApprovalCheck.reason,
                requiresAdminApproval: adminApprovalCheck.requiresAdminApproval,
                rejectCount: adminApprovalCheck.rejectCount || 0,
                reviewedBy: REVIEWER.SYSTEM,
                reviewedAt: new Date().toISOString(),
            },
        };

        this.logger?.log(
            `[createApplication] New application:`,
            newApplication,
        );

        const batch = db.batch();

        batch.set(this.orgCollection.doc(applicationID), newApplication);
        batch.update(this.userCollection.doc(userID), {
            organizerStatus: ORGANIZER_STATUS.PENDING,
            updatedAt: new Date().toISOString(),
        });

        await batch.commit();

        this.logger?.log(
            `[createApplication] Application committed: ${applicationID}`,
        );

        this.logger?.log(
            `[Cache Invalidate] Deleting user apps list cache for user ${userID}`,
        );
        await this.redisService.del(this._getUserAppsCacheKey(userID, {}));

        return {
            success: true,
            applicationID,
            requiresAdminApproval: adminApprovalCheck.requiresAdminApproval,
            message: adminApprovalCheck.requiresAdminApproval
                ? "Application submitted and requires admin approval."
                : "Application submitted successfully.",
        };
    }

    async updateApplication(applicationID, updateData, isAdmin = false) {
        const batch = db.batch();
        const docRef = this.orgCollection.doc(applicationID);
        const existingApp = await this.getApplicationByAppID(applicationID);

        // Chặn update các trường nhạy cảm nếu không phải admin
        if (!isAdmin) {
            const blockedStatuses = [
                APPLY_STATUS.APPROVED,
                APPLY_STATUS.CANCELLED,
                APPLY_STATUS.PERMANENT_REJECTED,
                APPLY_STATUS.PROCESSING,
            ];

            if (blockedStatuses.includes(existingApp.status)) {
                throw new AppError({
                    message: `Cannot update an application in status: ${existingApp.status}`,
                    errorCode: ERROR_CODE.INVALID_ACCOUNT_STATUS,
                    statusCode: 400,
                });
            }

            const protectedFields = [
                "status",
                "applicationID",
                "userID",
                "submittedAt",
                "submittedBy",
                "moderation",
            ];

            for (const field of protectedFields) {
                if (field in updateData) {
                    throw new AppError({
                        message: `Invalid '${field}' field`,
                        errorCode: ERROR_CODE.UNAUTHORIZED,
                        statusCode: 403,
                    });
                }
            }
        }

        let updatedDocuments = existingApp.documents || [];

        if (updateData.documents?.length) {
            const docMap = new Map();

            for (const doc of updatedDocuments) {
                docMap.set(doc.documentType, doc);
            }

            for (const newDoc of updateData.documents) {
                docMap.set(newDoc.documentType, {
                    ...docMap.get(newDoc.documentType),
                    ...newDoc,
                });
            }

            updatedDocuments = Array.from(docMap.values());
        }

        const updatedStatus =
            existingApp.status === APPLY_STATUS.EDITING
                ? APPLY_STATUS.PENDING_ADMIN
                : existingApp.status;

        // Merge data
        const mergedData = {
            applicationData: {
                ...existingApp.applicationData,
                ...updateData.applicationData,
            },
            representativeInfo: {
                ...existingApp.representativeInfo,
                ...updateData.representativeInfo,
            },
            documents: updatedDocuments,
            status: updatedStatus,
            updatedAt: new Date().toISOString(),
        };

        batch.set(docRef, mergedData, { merge: true });
        await batch.commit();
        this.logger?.log(
            `[Cache Invalidate] Deleting caches for app ${applicationID} and user ${existingApp.userID}`,
        );
        await this.redisService.del([
            this._getAppCacheKey(applicationID),
            this._getUserAppsCacheKey(existingApp.userID, {}),
        ]);

        return mergedData;
    }

    async updateApplicationStatus(
        applicationID,
        status,
        userID,
        reviewedBy = null,
        rejectionReason = null,
    ) {
        const batch = db.batch();
        const updateData = {
            status,
            updatedAt: new Date().toISOString(),
        };
        if (reviewedBy) {
            updateData.reviewedBy = reviewedBy;
            updateData.reviewedAt = new Date().toISOString();
        }
        if (rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        const application = await this.getApplicationByAppID(applicationID);
        if (application.userID !== userID) {
            throw new AppError({
                message: "You are not allowed to update application",
                errorCode: ERROR_CODE.UNAUTHORIZED,
                statusCode: 401,
            });
        }

        const appRef = this.orgCollection.doc(applicationID);
        const userRef = this.userCollection.doc(userID);

        batch.update(appRef, updateData);
        console.log(`updated data: ${updateData}`);

        const userOrganizerStatus =
            {
                [APPLY_STATUS.APPROVED]: ORGANIZER_STATUS.APPROVED,
                [APPLY_STATUS.REJECTED]: ORGANIZER_STATUS.NONE,
                [APPLY_STATUS.PERMANENT_REJECTED]: ORGANIZER_STATUS.NONE,
                [APPLY_STATUS.CANCELLED]: ORGANIZER_STATUS.NONE,
            }[status] || ORGANIZER_STATUS.PENDING;

        batch.update(userRef, {
            organizerStatus: userOrganizerStatus,
            updatedAt: new Date().toISOString(),
        });
        await batch.commit();

        await this.redisService.del([
            this._getAppCacheKey(applicationID),
            this._getUserAppsCacheKey(userID, {}),
        ]);

        this.logger?.log(
            `[Cache Invalidate] Deleting caches for app ${applicationID} and user ${userID}`,
        );
    }

    async deleteApplication(applicationID) {
        const appToDelete = await this.getApplicationByAppID(applicationID);

        if (!appToDelete || !appToDelete.userID) {
            this.logger?.warn(
                `[deleteApplication] Application ${applicationID} not found or has no userID. Nothing to delete or invalidate.`,
            );
            return;
        }

        // Tiến hành xóa khỏi DB
        await this.orgCollection.doc(applicationID).delete();

        // [CACHE] Xóa cache của đơn này VÀ danh sách đơn của người dùng
        this.logger?.log(
            `[Cache Invalidate] Deleting caches for app ${applicationID} and user ${appToDelete.userID}`,
        );
        await this.redisService.del([
            this._getAppCacheKey(applicationID),
            this._getUserAppsCacheKey(appToDelete.userID, {}),
        ]);
    }

    // Helper methods
    checkCooldownPeriod(applications) {
        const rejectedApps = applications.filter(
            (app) => app.status === APPLY_STATUS.REJECTED,
        );

        if (rejectedApps.length === 0) {
            return { canApply: true };
        }

        const latestRejection = rejectedApps[0];
        const rejectCount = rejectedApps.length;

        // Use named constants instead of magic numbers
        const cooldownDays = Math.min(
            COOLDOWN_CONSTANTS.BASE_DAYS *
                Math.pow(COOLDOWN_CONSTANTS.MULTIPLIER, rejectCount - 1),
            COOLDOWN_CONSTANTS.MAX_DAYS,
        );

        // Robustly handle both Firestore Timestamps and ISO strings
        const rejectionTimestamp =
            latestRejection.updatedAt ||
            latestRejection.submittedAt ||
            latestRejection.createdAt;
        const rejectionDate =
            typeof rejectionTimestamp.toDate === "function"
                ? rejectionTimestamp.toDate()
                : new Date(rejectionTimestamp);

        const now = new Date();
        const cooldownEnd = new Date(
            rejectionDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000,
        );

        if (now < cooldownEnd) {
            const daysLeft = Math.ceil(
                (cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
                canApply: false,
                reason: `You must wait ${daysLeft} more days before applying again.`,
                cooldownUntil: cooldownEnd.toISOString(),
                rejectCount,
                daysLeft,
            };
        }

        return { canApply: true };
    }

    checkAdminApprovalRequired(applications, user) {
        const rejectedCount = applications.filter(
            (app) => app.status === APPLY_STATUS.REJECTED,
        ).length;

        const reasons = [];

        if (rejectedCount >= ADMIN_APPROVAL_THRESHOLDS.REJECTION_COUNT) {
            reasons.push(`High rejection count (${rejectedCount})`);
        }
        if ((user.reportCount ?? 0) >= ADMIN_APPROVAL_THRESHOLDS.REPORT_COUNT) {
            reasons.push(`Multiple user reports (${user.reportCount})`);
        }
        if ((user.riskScore ?? 0) > ADMIN_APPROVAL_THRESHOLDS.RISK_SCORE) {
            reasons.push(`High risk score (${user.riskScore})`);
        }

        const requiresApproval = reasons.length > 0;

        return {
            requiresAdminApproval: requiresApproval,
            reason: requiresApproval ? reasons.join("; ") : "No issues found.",
            reasons,
            rejectCount: rejectedCount,
        };
    }

    _filterApplicationsBySearch(applications, searchTerm) {
        if (!searchTerm) {
            return applications;
        }

        const term = searchTerm.toLowerCase();

        return applications.filter((app) => {
            const searchableFields = [
                app.orgName,
                app.kycInfo?.fullName,
                app.moderation?.rejectionReason,
                app.description,
                app.applicationID,
                app.userID,
            ];

            return searchableFields.some(
                (field) =>
                    field &&
                    typeof field === "string" &&
                    field.toLowerCase().includes(term),
            );
        });
    }
}
