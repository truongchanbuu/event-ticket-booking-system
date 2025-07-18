import { catchAsync, FieldValue } from "@event_ticket_booking_system/shared";
import { normalizeFirebaseUser } from "../utils/sanitize.js";

export default class UserController {
    constructor({ userService }) {
        this.userService = userService;

        this.getUsers = catchAsync(this.getUsers.bind(this));
        this.getProfile = catchAsync(this.getProfile.bind(this));
        this.registerUser = catchAsync(this.registerUser.bind(this));
        this.updateUser = catchAsync(this.updateUser.bind(this));
        this.updateFollowedOrganizers = catchAsync(
            this.updateFollowedOrganizers.bind(this),
        );
        this.updateNotifications = catchAsync(
            this.updateNotifications.bind(this),
        );
        this.updateNotificationStatus = catchAsync(
            this.updateNotificationStatus.bind(this),
        );
    }

    async getUsers(req, res) {
        const data = await this.userService.getUsers(req.query);

        return res.status(200).json({
            success: true,
            data,
        });
    }

    async registerUser(req, res) {
        const uid = req.body.userID;
        const { user, isNew } = await this.userService.findOrCreateUser(
            uid,
            req.body,
        );

        return res.status(isNew ? 201 : 200).json({
            success: true,
            isNew,
            data: user,
        });
    }

    async updateUser(req, res) {
        const userID = req.params.userID || req.user.uid;

        const { success, data } = await this.userService.updateUser({
            userID,
            ...req.body,
        });

        if (!success) {
            return res
                .status(400)
                .json({ success, message: "failed to update" });
        }

        return res.status(200).json({ success, data });
    }

    async updateFollowedOrganizers(req, res) {
        const userID = req.user.uid;
        const executedAmount = await this.userService.updateFollowedOrganizers(
            userID,
            req.body.followedOrganizers,
            req.body.action,
        );

        if (executedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "failed to update organizers",
            });
        }

        return res
            .status(200)
            .json({ success: true, executed: executedAmount });
    }

    async updateNotifications(req, res) {
        const userID = req.user.uid;
        const data = await this.userService.updateNotifications(
            userID,
            req.body.notificationReferences,
            req.body.action,
        );

        return res.status(200).json(data);
    }

    async updateNotificationStatus(req, res) {
        const userID = req.user.uid;
        const { notificationID } = req.params;
        const data = this.userService.updateNotificationStatus(
            userID,
            notificationID,
            req.body.status,
        );

        return res.status(200).json({ success: true, data });
    }

    async softDeleteUser(req, res) {
        const userID = req.params.userID || req.user.uid;
        await this.userService.softDeleteUser(userID);

        return res.status(200).json({
            success: true,
            data: {
                userID,
                deletedAt: FieldValue.serverTimestamp(),
                deletedBy: req.user,
            },
        });
    }

    async deleteUser(req, res) {
        const userID = req.params.userID;
        const force = req.query.force;

        if (!force) {
            await this.userService.softDeleteUser(userID);
        } else {
            await this.userService.hardDeleteUser(userID);
        }
        return res.status(200).json({
            success: true,
            data: {
                userID,
                deletedAt: FieldValue.serverTimestamp(),
                deletedBy: req.user,
            },
        });
    }

    async getProfile(req, res) {
        const normalizedUser = normalizeFirebaseUser(req.user);
        const { user, isNew } = await this.userService.findOrCreateUser(
            normalizedUser.userID,
            normalizedUser,
        );

        return res.status(200).json({
            success: true,
            data: user,
            isNew,
        });
    }
}
