import { catchAsync } from "@event_ticket_booking_system/shared";

export default class UserController {
    constructor({ userService }) {
        this.userService = userService;

        this.getAllUser = catchAsync(this.getAllUser.bind(this));
    }

    async getAllUser(req, res) {
        const users = this.userService.getAllUser(req.query);

        return res.status(200).json({
            success: true,
            data: users,
        });
    }
}
