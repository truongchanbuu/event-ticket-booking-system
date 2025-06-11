import { catchAsync } from "@event_ticket_booking_system/shared";

export default class UserController {
    constructor({ userService }) {
        this.userService = userService;

        this.getAllUser = catchAsync(this.getAllUser.bind(this));
        this.registerUser = catchAsync(this.registerUser.bind(this));
        this.updateUser = catchAsync(this.updateUser.bind(this));
    }

    async getAllUser(req, res) {
        const users = await this.userService.getUsers(req.query);

        return res.status(200).json({
            success: true,
            data: users,
        });
    }

    async registerUser(req, res) {
        const { success, user } = await this.userService.createUser(req.body);

        if (!success) {
            return res
                .status(400)
                .json({ success, message: "Failed to create user" });
        }

        return res.status(201).json({
            success,
            data: user,
        });
    }

    async updateUser(req, res) {
        const { success, data } = await this.userService.updateUser({
            userID: req.params.userID,
            ...req.body,
        });

        if (!success) {
            return res
                .status(400)
                .json({ success, message: "failed to update" });
        }

        return res.status(200).json({ success, data });
    }
}
