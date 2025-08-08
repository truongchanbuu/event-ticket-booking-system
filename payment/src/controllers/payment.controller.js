import { catchAsync } from "@event_ticket_booking_system/shared";

export class PaymentController {
    constructor({ paymentService }) {
        this.paymentService = paymentService;

        this.getUserPaymentMethods = catchAsync(
            this.getUserPaymentMethods.bind(this),
        );
        this.createPaymentMethod = catchAsync(
            this.createPaymentMethod.bind(this),
        );
        this.updatePaymentMethod = catchAsync(
            this.updatePaymentMethod.bind(this),
        );
        this.deletePaymentMethod = catchAsync(
            this.deletePaymentMethod.bind(this),
        );
    }

    async getUserPaymentMethods(req, res) {
        const userID = req.user.uid;

        const paymentMethods =
            await this.paymentService.getPaymentMethodsByUserID(userID);

        res.status(200).json({
            success: true,
            count: paymentMethods.length,
            data: paymentMethods,
        });
    }

    async createPaymentMethod(req, res) {
        const userID = req.user.uid;
        const paymentData = req.body;

        const newPaymentMethod = await this.paymentService.createPaymentMethod(
            userID,
            paymentData,
        );

        res.status(201).json({
            success: true,
            data: newPaymentMethod,
        });
    }

    async updatePaymentMethod(req, res) {
        const userID = req.user.uid;
        const paymentMethodID = req.params.paymentMethodID;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No update data provided.",
            });
        }

        const updatedMethod = await this.paymentService.updatePaymentMethod(
            userID,
            paymentMethodID,
            updates,
        );

        if (!updatedMethod) {
            return res.status(404).json({
                success: false,
                message: "Payment method not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: updatedMethod,
        });
    }

    async deletePaymentMethod(req, res) {
        const userID = req.user.uid;
        const paymentMethodID = req.params.paymentMethodID;

        const result = await this.paymentService.deletePaymentMethod(
            userID,
            paymentMethodID,
        );

        res.status(200).json({
            success: result.success,
            message: "Payment method deleted successfully.",
        });
    }
}
