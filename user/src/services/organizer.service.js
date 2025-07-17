import {
    AppError,
    APPLY_STATUS,
    ERROR_CODE,
    ORGANIZER_STATUS,
    db,
    FieldValue,
} from "@event_ticket_booking_system/shared";
import { USER_STATUS } from "../enums/user-status.enum.js";

const ORG_APPLICATION_COLLECTION = "orgApplications";
const USER_COLLECTION = "users";
const LIMIT_APPLY = 5;

export default class UserService {
    constructor({ logger }) {
        this.logger = logger;
        this.userCollection = db.collection(USER_COLLECTION);
        this.orgCollection = db.collection(ORG_APPLICATION_COLLECTION);
        this.LIMIT_APPLY = LIMIT_APPLY;
    }

    async getAllApplications(options = {}) {
        const {
            limit = 20,
            status,
            search,
            lastVisibleValue,
            sortBy = "createdAt",
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

        let q = query(this.orgCollection);

        if (status) {
            q = query(q, where("status", "==", status));
        }

        if (userID) {
            q = query(q, where("userID", "==", userID));
        }

        if (dateFrom) {
            q = query(q, where("createdAt", ">=", dateFrom));
        }

        if (dateTo) {
            q = query(q, where("createdAt", "<=", dateTo));
        }

        q = query(q, orderBy(sortBy, sortOrder));

        if (lastVisibleValue) {
            q = query(q, startAfter(lastVisibleValue));
        }

        q = query(q, limit(safeLimit));

        const querySnapshot = await getDocs(q);

        const applications = [];
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

        if (search.trim() !== "") {
            applications = this._filterApplicationsBySearch(
                applications,
                search.trim(),
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
        const applicationSnap = await this.orgCollection.doc(appID).get();

        if (applicationSnap.exists()) {
            throw new AppError({
                errorCode: ERROR_CODE.USER_NOT_FOUND,
                message: "Application not found.",
                statusCode: 404,
            });
        }

        return applicationSnap.data();
    }

    async getApplicationsByUserID(
        userID,
        { orderBy = "desc", sortBy = "createdAt" } = {},
    ) {
        const applicationSnap = await this.orgCollection
            .where("userID", "==", userID)
            .orderBy(sortBy, orderBy)
            .get();

        if (applicationSnap.empty) {
            return [];
        }

        return applicationSnap.docs.map((doc) => doc.data());
    }

    async canApplyOrganizer(userID) {
        try {
            const userSnap = await this.userCollection.doc(userID).get();

            if (!userSnap.exists()) {
                return {
                    canApply: false,
                    reason: "User not found.",
                    errorCode: ERROR_CODE.USER_NOT_FOUND,
                };
            }

            const user = userSnap.data();

            if (user.isDeleted || user.deletedAt) {
                return {
                    canApply: false,
                    reason: "Account has been disabled.",
                    errorCode: ERROR_CODE.ACCOUNT_DISABLED,
                };
            }

            if (user.status !== USER_STATUS.ACTIVE) {
                const statusMessages = {
                    [USER_STATUS.BANNED]:
                        "Account has been banned permanently.",
                    [USER_STATUS.SUSPENDED]:
                        "Account is temporarily suspended.",
                    [USER_STATUS.INACTIVE]: "Account is not active.",
                    [USER_STATUS.PENDING]: "Account is not active.",
                    [USER_STATUS.UNVERIFIED]: "Account is not active.",
                };

                return {
                    canApply: false,
                    reason:
                        statusMessages[user.status] ||
                        "Account cannot be used.",
                    requireAdminApproval: user.status === USER_STATUS.BANNED,
                    errorCode: ERROR_CODE.INVALID_ACCOUNT_STATUS,
                };
            }

            if (user.organizerStatus === ORGANIZER_STATUS.APPROVED) {
                return {
                    canApply: false,
                    reason: "You are already an organizer.",
                    errorCode: ERROR_CODE.ALREADY_ORGANIZER,
                };
            }

            const applications = await this.getApplicationsByUserID(userID);

            if (applications.length !== 0) {
                const latestApp = applications[0];

                if (latestApp.status === APPLY_STATUS.PENDING) {
                    return {
                        canApply: false,
                        reason: "Your application is currently being processed. Please wait for approval.",
                        applicationId: latestApp.applicationID,
                        errorCode: ERROR_CODE.PENDING_APPLICATION,
                    };
                }

                if (latestApp.status === APPLY_STATUS.PERMANENT_REJECTED) {
                    return {
                        canApply: false,
                        reason: "Your account has been permanently restricted from becoming an organizer. Please contact admin for support.",
                        requireAdminApproval: true,
                        errorCode: ERROR_CODE.PERMANENT_REJECTED,
                    };
                }

                if (applications.length > this.LIMIT_APPLY) {
                    return {
                        canApply: false,
                        reason: "You have exceeded the maximum number of applications. Please contact admin to become an organizer.",
                        requireAdminApproval: true,
                        applicationCount: applications.length,
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
                        reason: "Your application requires admin approval. Please contact admin for support.",
                        requireAdminApproval: true,
                        errorCode: ERROR_CODE.REQUIRES_ADMIN_APPROVAL,
                        ...adminApprovalResult,
                    };
                }
            }

            return {
                canApply: true,
                message: "You can apply to become an organizer.",
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
        const canApplyResult = await this.canApplyOrganizer(userID);

        if (!canApplyResult.canApply) {
            throw new AppError({
                message: canApplyResult.reason,
                statusCode: 403,
                errorCode: canApplyResult.errorCode,
            });
        }

        const applications = await this.getApplicationsByUserID(userID);
        const user = (await this.userCollection.doc(userID).get()).data();
        const adminApprovalCheck = this.checkAdminApprovalRequired(
            applications,
            user,
        );

        const applicationID = `oa_${Date.now()}_${userID.slice(-4)}`;
        const newApplication = {
            applicationID,
            ...applicationData,
            status: adminApprovalCheck.requiresAdminApproval
                ? APPLY_STATUS.PENDING_ADMIN
                : APPLY_STATUS.PENDING,
            requiresAdminApproval: adminApprovalCheck.requiresAdminApproval,
            rejectCount: adminApprovalCheck.rejectCount || 0,
            createdAt: FieldValue.serverTimestamp(),
        };

        const batch = db.batch();

        batch.set(this.orgCollection.doc(applicationID), newApplication);
        batch.update(this.userCollection.doc(userID), {
            organizerStatus: ORGANIZER_STATUS.PENDING,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

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
        const docRef = this.orgCollection.doc(applicationID);
        const docSnap = await docRef.get();

        if (!docSnap.exists()) {
            throw new AppError({
                message: "Application not found.",
                errorCode: ERROR_CODE.NOT_FOUND,
                statusCode: 404,
            });
        }

        const existingApp = docSnap.data();

        const blockedStatuses = [
            APPLY_STATUS.APPROVED,
            APPLY_STATUS.CANCELLED,
            APPLY_STATUS.PERMANENT_REJECTED,
            APPLY_STATUS.REJECTED,
            APPLY_STATUS.PROCESSING,
        ];
        if (blockedStatuses.includes(existingApp.status)) {
            throw new AppError({
                message: `Cannot update an application in status: ${existingApp.status}`,
                errorCode: ERROR_CODE.INVALID_ACCOUNT_STATUS,
                statusCode: 400,
            });
        }

        const mergedData = {
            ...existingApp,
            orgName: updateData.orgName ?? existingApp.orgName,
            description: updateData.description ?? existingApp.description,
            optionalInfo: {
                ...existingApp.optionalInfo,
                ...updateData.optionalInfo,
            },
            kycInfo: {
                ...existingApp.kycInfo,
                individual: {
                    ...existingApp.kycInfo?.individual,
                    ...updateData.kycInfo?.individual,
                },
                business: {
                    ...existingApp.kycInfo?.business,
                    ...updateData.kycInfo?.business,
                },
            },
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (!isAdmin) {
            const protectedFields = [
                "status",
                "rejectCount",
                "rejectionReason",
                "cooldownUntil",
                "requiresAdminApproval",
                "createdAt",
                "lastRejectedAt",
                "reviewedBy",
                "reviewedAt",
                "userID",
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

        await docRef.set(mergedData, { merge: true });

        return {
            success: true,
            message: "Application updated successfully",
            application: mergedData,
        };
    }

    async updateApplicationStatus(
        applicationID,
        status,
        userID,
        reviewedBy = null,
        rejectionReason = null,
    ) {
        const updateData = {
            status,
            updatedAt: FieldValue.serverTimestamp(),
            ...(reviewedBy && {
                reviewedBy,
                reviewedAt: FieldValue.serverTimestamp(),
            }),
            ...(rejectionReason && { rejectionReason }),
        };

        await this.orgCollection.doc(applicationID).update(updateData);

        const application = (
            await this.orgCollection.doc(applicationID).get()
        ).data();

        if (application.userID !== userID) {
            throw new AppError({
                message: "You are not allowed to update application",
                errorCode: ERROR_CODE.UNAUTHORIZED,
                statusCode: 401,
            });
        }

        const userOrganizerStatus =
            {
                [APPLY_STATUS.APPROVED]: ORGANIZER_STATUS.APPROVED,
                [APPLY_STATUS.REJECTED]: ORGANIZER_STATUS.NONE,
                [APPLY_STATUS.PERMANENT_REJECTED]: ORGANIZER_STATUS.NONE,
                [APPLY_STATUS.CANCELLED]: ORGANIZER_STATUS.NONE,
            }[status] || ORGANIZER_STATUS.PENDING;

        await this.userCollection.doc(userID).update({
            organizerStatus: userOrganizerStatus,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, applicationID, status };
    }

    async deleteApplication(applicationID) {
        await this.orgCollection.doc(applicationID).delete();
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

        // Calculate cooldown period: 7 days for first rejection (7 → 14 → 28 → 56 → 90 days max)
        const cooldownDays = Math.min(7 * Math.pow(2, rejectCount - 1), 90);

        let rejectionDate;
        if (latestRejection.updatedAt) {
            rejectionDate = latestRejection.updatedAt.toDate();
        } else {
            rejectionDate = latestRejection.createdAt.toDate();
        }

        const cooldownEnd = new Date(
            rejectionDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000,
        );

        if (new Date() < cooldownEnd) {
            const daysLeft = Math.ceil(
                (cooldownEnd - new Date()) / (24 * 60 * 60 * 1000),
            );
            return {
                canApply: false,
                reason: `You must wait ${daysLeft} more days before applying again.`,
                cooldownUntil: cooldownEnd,
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

        // Require admin approval if:
        // - More than 2 rejections
        // - User has been reported multiple times
        // - User has high risk score
        const requiresApproval =
            rejectedCount >= 2 ||
            (user.reportCount && user.reportCount >= 3) ||
            (user.riskScore && user.riskScore > 0.7);

        return {
            requiresAdminApproval: requiresApproval,
            reason:
                rejectedCount >= 2
                    ? `Too many rejections (${rejectedCount})`
                    : "High risk profile",
            rejectCount: rejectedCount,
        };
    }

    _filterApplicationsBySearch(applications, searchTerm) {
        const term = searchTerm.toLowerCase();

        return applications.filter((app) => {
            if (app.orgName && app.orgName.toLowerCase().includes(term)) {
                return true;
            }

            // Search in full name (KYC info)
            if (
                app.kycInfo?.fullName &&
                app.kycInfo.fullName.toLowerCase().includes(term)
            ) {
                return true;
            }

            // Search in rejection reason
            if (
                app.rejectionReason &&
                app.rejectionReason.toLowerCase().includes(term)
            ) {
                return true;
            }

            // Search in description
            if (
                app.description &&
                app.description.toLowerCase().includes(term)
            ) {
                return true;
            }

            // Search in application ID
            if (
                app.applicationID &&
                app.applicationID.toLowerCase().includes(term)
            ) {
                return true;
            }

            return false;
        });
    }
}
