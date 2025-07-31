import {
    APPLY_STATUS,
    catchAsync,
    ROLE,
    USER_APPROVED_AS_ORGANIZER,
} from "@event_ticket_booking_system/shared";

export class OrganizerController {
    constructor({
        userService,
        organizerService,
        applicationEventService,
        logger,
    }) {
        this.logger = logger;
        this.userService = userService;
        this.organizerService = organizerService;
        this.applicationEventService = applicationEventService;

        this.getOrganizers = catchAsync(this.getOrganizers.bind(this));
        this.getPublicOrganizers = catchAsync(
            this.getPublicOrganizers.bind(this),
        );
        this.getOrganizerProfile = catchAsync(
            this.getOrganizerProfile.bind(this),
        );
        this.applyOrganizer = catchAsync(this.applyOrganizer.bind(this));
        this.getAllApplications = catchAsync(
            this.getAllApplications.bind(this),
        );
        this.getApplicationByID = catchAsync(
            this.getApplicationByID.bind(this),
        );
        this.updateApplication = catchAsync(this.updateApplication.bind(this));
        this.deleteApplication = catchAsync(this.deleteApplication.bind(this));
        this.getMyApplications = catchAsync(this.getMyApplications.bind(this));
        this.getMyApplicationDetail = catchAsync(
            this.getMyApplicationDetail.bind(this),
        );
        this.updateMyApplication = catchAsync(
            this.updateMyApplication.bind(this),
        );
        this.cancelMyApplication = catchAsync(
            this.cancelMyApplication.bind(this),
        );
        this.deactivateOrganizer = catchAsync(
            this.deactivateOrganizer.bind(this),
        );
        this.checkApplication = catchAsync(this.checkApplication.bind(this));
    }

    async getOrganizers(req, res) {
        req.query.role = ROLE.EVENT_ORGANIZER;
        const users = await this.userService.getUsers(req.query);

        return res.status(200).json({
            success: true,
            data: users,
        });
    }

    async getPublicOrganizers(req, res) {
        const data = await this.userService.getPublicOrganizers(req.query);

        return res.status(200).json({
            success: true,
            data,
        });
    }

    async getOrganizerProfile(req, res) {
        const data = this.userService.getOrganizerProfile(req.params.orgID);
        return res.status(200).json({ success: true, data });
    }

    async applyOrganizer(req, res) {
        this.logger?.debug("req: ", req.body);
        const userID = req.user.uid;

        const applicationData = {
            userID,
            ...req.body,
        };

        const result =
            await this.organizerService.createApplication(applicationData);

        this.logger?.info("Organizer application created", {
            userID,
            applicationID: result.applicationID,
            requiresAdminApproval: result.requiresAdminApproval,
        });

        this.logger?.debug("data: ", JSON.stringify(result));
        return res.status(201).json({
            success: true,
            data: {
                applicationID: result.applicationID,
                requiresAdminApproval: result.requiresAdminApproval,
                message: result.message,
            },
        });
    }

    async getAllApplications(req, res) {
        const result = await this.organizerService.getAllApplications(
            req.query,
        );

        return res.status(200).json({
            success: true,
            data: result.applications,
            meta: {
                count: result.count,
                hasMore: result.hasMore,
                lastVisibleValue: result.lastVisibleValue,
            },
        });
    }

    async getApplicationByID(req, res) {
        const appID = req.params.applicationID;
        const application =
            await this.organizerService.getApplicationByAppID(appID);

        return res.status(200).json({ sucess: true, data: application });
    }

    async updateApplication(req, res) {
        const { applicationID } = req.params;
        const updateData = req.body;
        const isAdmin = req.user.role === ROLE.ADMIN;

        const result = await this.organizerService.updateApplication(
            applicationID,
            updateData,
            isAdmin,
        );

        return res.status(200).json({ success: true, data: result });
    }

    async deleteApplication(req, res) {
        const force = req.query.force;
        const appID = req.params.applicationID;
        const reason = req.body?.reason;

        if (force) {
            await this.organizerService.deleteApplication(appID);
        } else {
            await this.organizerService.updateApplicationStatus(
                appID,
                APPLY_STATUS.CANCELLED,
                "admin",
                reason,
            );
        }

        return res.status(200).json({
            success: true,
            message: force
                ? "Delete application successfully"
                : "Cancel application successfully",
            data: appID,
        });
    }

    async getMyApplications(req, res) {
        const uid = req.user.uid;
        this.logger?.debug("uid: ", uid);
        const applications =
            await this.organizerService.getApplicationsByUserID(uid);
        this.logger?.debug(
            `APPLICATIONS FOUND: ${applications?.length} - ${applications}`,
        );
        return res.status(200).json({ success: true, data: applications });
    }

    async getMyApplicationDetail(req, res) {
        const appID = req.params.applicationID;
        const app = await this.organizerService.getApplicationByAppID(appID);

        this.logger?.debug(`appid ${appID} - app: ${JSON.stringify(app)}`);

        if (app.userID !== uid) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this application",
            });
        }

        return res.status(200).json({ success: true, data: app });
    }

    async updateMyApplication(req, res) {
        const uid = req.user.uid;
        const applicationID = req.params.applicationID;
        const updateData = req.body;

        this.logger?.debug(`updated : ${JSON.stringify(updateData)}`);

        const app =
            await this.organizerService.getApplicationByAppID(applicationID);

        if (app.userID !== uid) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this application.",
            });
        }

        if (app.status === APPLY_STATUS.LOCKED_BY_ADMIN) {
            return res.status(401).json({
                success: false,
                message: "This application has been locked.",
            });
        }

        await this.organizerService.updateApplication(
            applicationID,
            updateData,
        );

        return res.status(200).json({
            success: true,
            message: "Application updated successfully",
        });
    }

    async cancelMyApplication(req, res) {
        const uid = req.user.uid;
        const appID = req.params.applicationID;
        const reason = req.body.reason;

        await this.organizerService.updateApplicationStatus(
            appID,
            APPLY_STATUS.CANCELLED,
            uid,
            reason,
        );

        return res.status(200).json({
            success: true,
            message: "Canceled successfully",
            data: appID,
        });
    }

    async deactivateOrganizer(req, res) {
        const userID = req.params.uid;
        const applications =
            await this.organizerService.getApplicationsByUserID(userID);
        const approvedApplication = applications.find(
            (app) => app.status === APPLY_STATUS.APPROVED,
        );

        if (!approvedApplication) {
            return res.status(404).json({
                success: false,
                message: "You are not an event organizer",
            });
        }

        await this.updateApplication(approvedApplication.applicationID, {
            status: APPLY_STATUS.CANCELLED,
        });

        const updatedUser = { userID, role: ROLE.CUSTOMER };
        await this.userService.updateUser(updatedUser);

        return res.status(200).json({ success: true, data: updatedUser });
    }

    async checkApplication(req, res) {
        // 1. Lấy tất cả thông tin cần thiết từ request
        const { uid, role } = req.user;
        const { applicationID, status } = req.params;
        const { reviewedBy, rejectionReason } = req.body;

        this.logger?.debug(`DATA: ${uid} - role: ${role}`);

        // 2. Rào chắn bảo vệ: Kiểm tra dữ liệu đầu vào có hợp lệ không
        if (!Object.values(APPLY_STATUS).includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status: ${status}`,
            });
        }

        // 3. Lấy thông tin đơn ứng tuyển từ database
        const application =
            await this.organizerService.getApplicationByAppID(applicationID);
        if (!application) {
            return res
                .status(404)
                .json({ success: false, message: "Application not found" });
        }

        const isOwner = application.userID === uid;
        const isAdmin = role === ROLE.ADMIN;

        // 4. Rào chắn bảo vệ: Người dùng không phải admin và cũng không phải chủ đơn thì từ chối ngay
        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to access this application.",
            });
        }

        // 5. Logic xử lý quyền hạn cho người dùng (không phải admin)
        if (!isAdmin) {
            if (status !== APPLY_STATUS.EDITING) {
                return res.status(403).json({
                    success: false,
                    message: `As a user, you can only change status to ${APPLY_STATUS.EDITING}.`,
                });
            }

            // Người dùng không được chỉnh sửa khi đơn đang được xử lý
            const editableStatuses = [APPLY_STATUS.EDITING];
            if (!editableStatuses.includes(application.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Application with status '${application.status}' cannot be edited.`,
                });
            }
        }

        if (isAdmin) {
            if (status === APPLY_STATUS.LOCKED_BY_ADMIN) {
                return res.status(400).json({
                    success: false,
                    message: "Locking should be available for editing mode.",
                });
            }
        }

        // TODO: Có thể thêm 1 transition validation (Giữ nguyên theo yêu cầu)

        await this.organizerService.updateApplicationStatus(
            applicationID,
            status,
            application.userID,
            reviewedBy ?? "admin",
            rejectionReason,
        );

        const baseEventPayload = {
            key: application.userID,
            value: {
                userID: application.userID,
                applicationId: application.applicationID,
                processedBy: uid,
            },
        };

        // Xử lý các tác vụ phụ khi đơn được chấp thuận
        if (status === APPLY_STATUS.APPROVED) {
            await this.userService.updateUser({
                userID: application.userID,
                role: ROLE.EVENT_ORGANIZER,
                organizerStatus: status,
            });

            this.applicationEventService.sendApplicationApprovedEvent({
                key: baseEventPayload.key,
                value: {
                    ...baseEventPayload.value,
                    action: "approved",
                    approvedAt: new Date().toISOString(),
                },
            });
        }

        if (status === APPLY_STATUS.REJECTED) {
            this.applicationEventService.sendApplicationRejectedEvent({
                key: baseEventPayload.key,
                value: {
                    ...baseEventPayload.value,
                    action: "rejected",
                    rejectedAt: new Date().toISOString(),
                    reason: rejectionReason,
                },
            });
        }

        if (status === APPLY_STATUS.PERMANENT_REJECTED) {
            this.applicationEventService.sendApplicationPermanentlyRejectedEvent(
                {
                    key: baseEventPayload.key,
                    value: {
                        ...baseEventPayload.value,
                        action: "permantly_rejected",
                        rejectedAt: new Date().toISOString(),
                        reason: rejectionReason,
                    },
                },
            );
        }

        return res.status(200).json({
            success: true,
            message: `Application status successfully updated to ${status}.`,
            data: {
                applicationID: application.applicationID,
                status,
            },
        });
    }
}
