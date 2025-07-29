import {
    APPLY_STATUS,
    catchAsync,
    EVENT_TYPES,
    ROLE,
} from "@event_ticket_booking_system/shared";
import { sendUserRoleChanged } from "../kafka/user.event.js";
import { sendAppStatusChanged } from "../kafka/application.event.js";

export default class UserController {
    constructor({ userService, organizerService }) {
        this.userService = userService;
        this.organizerService = organizerService;

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
        console.log("req: ", req.body);
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

        console.log("data: ", JSON.stringify(result));
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
        const application = this.organizerService.getApplicationByAppID(appID);
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

        return res.status(200).json(result);
    }

    async deleteApplication(req, res) {
        const force = req.query.force;
        const appID = req.params.applicationID;
        const reason = req.body.reason;

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
        console.log("uid: ", uid);
        const applications =
            await this.organizerService.getApplicationsByUserID(uid);
        console.log(
            `APPLICATIONS FOUND: ${applications?.length} - ${applications}`,
        );
        return res.status(200).json({ success: true, data: applications });
    }

    async getMyApplicationDetail(req, res) {
        const appID = req.params.applicationID;
        const app = await this.organizerService.getApplicationByID(appID);

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

        const app =
            await this.organizerService.getApplicationByID(applicationID);

        if (app.userID !== uid) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this application",
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
        sendUserRoleChanged({
            userID,
            previousRole: ROLE.EVENT_ORGANIZER,
            newRole: ROLE.CUSTOMER,
            reason: "organizer_deactivated",
        }).catch((e) => console.error("Role updated failed, ", e));

        return res.status(200).json({ success: true, data: updatedUser });
    }

    async checkApplication(req, res) {
        const appID = req.params.applicationID;
        const { status, reviewedBy, rejectionReason } = req.body;

        const application =
            await this.organizerService.getApplicationByAppID(appID);

        if (!application) {
            return res
                .status(404)
                .json({ success: false, message: "There is no application" });
        }

        await this.organizerService.updateApplicationStatus(
            appID,
            status,
            application.userID,
            reviewedBy ?? "admin",
            rejectionReason,
        );

        if (status === APPLY_STATUS.APPROVED) {
            await this.userService.updateUser({
                userID: application.userID,
                role: ROLE.EVENT_ORGANIZER,
                organizerStatus: status,
            });

            sendUserRoleChanged({
                userID: application.userID,
                previousRole: ROLE.CUSTOMER,
                newRole: ROLE.EVENT_ORGANIZER,
                reason: "application approved",
            }).catch((e) => console.error("failed to send role changed: ", e));
        }

        const eventType =
            status === APPLY_STATUS.APPROVED
                ? EVENT_TYPES.APPLICATION_APPROVED
                : EVENT_TYPES.APPLICATION_REJECTED;

        sendAppStatusChanged(
            {
                ...application,
                status,
                reviewedBy,
                rejectionReason,
            },
            eventType,
        ).catch((e) => console.error("send application changed failed: ", e));

        return res.status(200).json({
            success: true,
            message: `Application ${status}`,
            data: {
                applicationID: appID,
                status,
            },
        });
    }
}
