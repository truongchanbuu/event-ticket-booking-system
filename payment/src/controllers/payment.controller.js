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

        this.confirm = catchAsync(this.confirm.bind(this));
        this.refund = catchAsync(this.refund.bind(this));

        this.ipnMomo = this.ipnMomo.bind(this);
        this.simulateMomoIpn = this.simulateMomoIpn.bind(this);

        this.getPaymentIntentByReservationID = catchAsync(
            this.getPaymentIntentByReservationID.bind(this),
        );
        this.getPaymentByIntentID = catchAsync(
            this.getPaymentByIntentID.bind(this),
        );
    }

    _bool = (v) => {
        if (typeof v === "string") {
            const s = v.trim().toLowerCase();
            return (
                s === "1" ||
                s === "true" ||
                s === "yes" ||
                s === "y" ||
                s === "on"
            );
        }
        return Boolean(v);
    };

    _intentView = (i, { includeRaw = false } = {}) => ({
        paymentIntentID: i.paymentIntentID || i.id || null,
        reservationID: i.reservationID || null,
        provider: i.provider || null,
        status: i.status || null,
        amount: i.amount ?? null,
        currency: i.currency || "VND",
        transactionId: i.transactionId || null,
        orderId: i.orderId || null,
        // các field tiện cho FE nếu có
        qrUrl: i.qrUrl || i.paymentQrUrl || i.qr || null,
        expiresAt: i.expiresAt || i.expiry || null,
        // meta từ confirmByIntent()
        confirmed: Boolean(i.confirmed),
        refreshed: Boolean(i.refreshed),
        source: i.source || "cache",
        createdAt: i.createdAt || null,
        updatedAt: i.updatedAt || i.statusUpdatedAt || null,
        ...(includeRaw && i.providerLastRaw
            ? { providerLastRaw: i.providerLastRaw }
            : {}),
    });

    getPaymentIntentByReservationID = async (req, res) => {
        try {
            const reservationID = String(
                req.params?.rid || req.query?.reservationID || "",
            ).trim();
            if (!reservationID) {
                return res.status(400).json({
                    success: false,
                    message: "RESERVATION_ID_REQUIRED",
                    errorCode: ERROR_CODE.INVALID_DATA,
                });
            }

            const refresh = this._bool(req.query?.refresh);
            const includeRaw = this._bool(req.query?.includeRaw);

            const intent = await this.paymentService.confirmByIntent({
                reservationID,
                refresh,
            });
            const data = this._intentView(intent, { includeRaw });

            return res.status(200).json({ success: true, message: "OK", data });
        } catch (err) {
            const status = err?.statusCode || err?.status || 500;
            return res.status(status).json({
                success: false,
                message: err?.message || "INTERNAL_ERROR",
                errorCode: err?.errorCode || ERROR_CODE.INTERNAL_ERROR,
            });
        }
    };

    getPaymentByIntentID = async (req, res) => {
        try {
            const paymentIntentID = String(
                req.params?.intentId ||
                    req.params.intentID ||
                    req.query?.paymentIntentID ||
                    "",
            ).trim();
            if (!paymentIntentID) {
                return res.status(400).json({
                    success: false,
                    message: "PAYMENT_INTENT_ID_REQUIRED",
                    errorCode: ERROR_CODE.INVALID_DATA,
                });
            }

            const refresh = this._bool(req.query?.refresh);
            const includeRaw = this._bool(req.query?.includeRaw);

            const intent = await this.paymentService.confirmByIntent({
                paymentIntentID,
                refresh,
            });
            const data = this._intentView(intent, { includeRaw });

            return res.status(200).json({ success: true, message: "OK", data });
        } catch (err) {
            const status = err?.statusCode || err?.status || 500;
            return res.status(status).json({
                success: false,
                message: err?.message || "INTERNAL_ERROR",
                errorCode: err?.errorCode || ERROR_CODE.INTERNAL_ERROR,
            });
        }
    };

    async confirm(req, res, next) {
        const payload =
            (req.validated && typeof req.validated === "object"
                ? req.validated
                : null) ||
            (req.body && typeof req.body === "object" ? req.body : {});

        const { paymentIntentID, reservationID, refresh = false } = payload;

        const result = await this.svc.confirmByIntent({
            paymentIntentID,
            reservationID,
            refresh,
        });

        return res.status(200).json({
            success: true,
            message: "Payment confirmation checked",
            data: {
                paymentIntentID: result.paymentIntentID,
                reservationID: result.reservationID,
                provider: result.provider,
                status: result.status,
                confirmed: result.confirmed,
                refreshed: result.refreshed,
                source: result.source, // "cache" | "provider"
                amount: result.amount,
                currency: result.currency,
                transactionId: result.transactionId || null,
                lastProviderCheckAt: result.lastProviderCheckAt || null,
                statusUpdatedAt: result.statusUpdatedAt || null,
            },
        });
    }

    async refund(req, res) {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const idemKey =
            req.get("Idempotency-Key") || `${body.reservationID || ""}:refund`;

        const { statusCode, envelope } =
            await this.paymentService.createOrGetRefund({
                reservationID: body.reservationID,
                reason: body.reason,
                metadata: body.metadata,
                idemKey,
            });

        return res.status(statusCode || 200).json(envelope);
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

        const newPaymentMethod =
            await this.paymentService.findOrCreatePaymentMethod(
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

    // POST /api/payment/momo/ipn
    async ipnMomo(req, res) {
        const payload = req.body || {};
        const provider = await this.paymentProviderFactory();
        const v = await provider.verifyIpn(payload);
        if (!v.ok) return res.sendStatus(400);

        // lưu state cho verify() (mock)
        if (provider.kind === "mock_momo") {
            await this.mockMomoProvider.recordIpnState({
                orderId: v.orderId,
                resultCode: payload.resultCode,
                transId: v.transactionId,
                amount: v.amount,
            });
        }

        // await this.paymentService.processIpnResult({
        //     orderId: v.orderId,
        //     reservationId:
        //         this.paymentService.reservationIdFromOrderId?.(v.orderId) ||
        //         v.orderId.replace(/^ORD_/, ""),
        //     status: v.status,
        //     amount: v.amount,
        //     currency: v.currency,
        //     transactionId: v.transactionId,
        //     raw: v.raw,
        // });

        return res.sendStatus(204);
    }

    // POST /_simulator/payments/momo
    async simulateMomoIpn(req, res) {
        const {
            orderId,
            amount = 100000,
            scene = "SUCCESS",
            delayMs = 0,
            repeat = 1,
        } = req.body || {};
        const resultCode =
            scene === "SUCCESS"
                ? 0
                : scene === "CANCELED"
                  ? 53
                  : scene === "EXPIRED"
                    ? 49
                    : scene === "LATE_SUCCESS"
                      ? 0
                      : scene === "FAILED"
                        ? 99
                        : 0;

        for (let i = 0; i < Number(repeat || 1); i++) {
            await this.mockMomoProvider.simulateIpn({
                orderId,
                amount,
                resultCode,
                delayMs: i === 0 ? delayMs : 0,
            });
        }
        return res.json({ ok: true, orderId, scene, delayMs, repeat });
    }
}
