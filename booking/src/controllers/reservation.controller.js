import { catchAsync } from "@event_ticket_booking_system/shared";

export class ReservationController {
    constructor({ reservationService, logger = console }) {
        this.svc = reservationService;
        this.logger = logger;

        this.getReservationByID = catchAsync(
            this.getReservationByID.bind(this),
        );
        this.createReservation = catchAsync(this.createReservation.bind(this));
        this.cancelReservation = catchAsync(this.cancelReservation.bind(this));
        this.confirmReservation = catchAsync(
            this.confirmReservation.bind(this),
        );
        this.buyerClaim = catchAsync(this.buyerClaim.bind(this));
    }

    async getReservationByID(req, res) {
        const started = Date.now();
        const rid = req.params?.rid;
        try {
            const includePayment =
                (req.query?.payment ?? "1") !== "0" &&
                (req.query?.payment ?? "1") !== "false";
            const refreshPayment =
                (req.query?.refresh ?? "0") === "1" ||
                (req.query?.refresh ?? "0") === "true";

            const result = await this.svc.getReservationByID({
                reservationId: rid,
                includePayment,
                refreshPayment,
            });

            return res.status(result.statusCode).json(result.body);
        } catch (e) {
            this.logger.error("[GET /reservation/:rid] error", {
                rid,
                err: e?.message,
            });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        } finally {
            this.logger.info("[GET /reservation/:rid] done", {
                rid,
                durMs: Date.now() - started,
            });
        }
    }

    async createReservation(req, res) {
        const started = Date.now();
        try {
            const idemKey = String(req.get("Idempotency-Key") || "").trim();
            const ip =
                req.ip ||
                req.headers["x-forwarded-for"] ||
                req.socket?.remoteAddress ||
                "unknown";
            const userId = req.get("x-user-id") || null;
            const userAgent = req.get("user-agent") || null;
            const { eventId, lines } = req.body;

            const result = await this.svc.createReservation({
                eventId,
                lines,
                idemKey,
                clientIp: ip,
                userId,
                userAgent,
            });

            console.log(`result from reservation: ${JSON.stringify(result)}`);

            return res.status(result.statusCode).json(result.body);
        } finally {
            this.logger.info("[/checkout/reservations] done", {
                durMs: Date.now() - started,
            });
        }
    }

    async cancelReservation(req, res) {
        const { id } = req.params; // /checkout/reservations/:id/cancel
        const result = await this.svc.cancelReservation({
            reservationId: String(id || "").trim(),
        });
        return res.status(result.statusCode).json(result.body);
    }

    async confirmReservation(req, res) {
        const { reservationId } = req.body;
        const userId = req.get("x-user-id") || null;
        const result = await this.svc.confirmReservation({
            reservationId,
            userId,
        });
        return res.status(result.statusCode).json(result.body);
    }

    buyerClaim = async (req, res) => {
        const reservationId = String(req.params?.rid || "").trim();
        if (!reservationId) {
            return res
                .status(400)
                .json({ success: false, error: "RESERVATION_ID_REQUIRED" });
        }

        // chấp nhận nhiều dạng payload: { buyer }, { buyerClaim }, hoặc body thẳng
        const buyer = req.body?.buyer || req.body?.buyerClaim || req.body || {};

        const userId =
            req.user?.uid ||
            req.userId ||
            req.userID ||
            buyer.userID ||
            buyer.userId ||
            null;

        const resp = await this.svc.setBuyerClaim({
            reservationId,
            buyer,
            userId,
            clientIp: req.ip,
            userAgent: req.get("user-agent"),
        });

        const statusCode = Number(resp?.statusCode) || 200;
        const body = resp?.body || {};

        // === ĐÃ CHUẨN HÓA Ở SERVICE ===
        if (body.success === true) {
            // nếu service đã gói sẵn data thì chuyển nguyên si,
            // còn nếu vẫn trả rời rạc thì map sang data
            const data = body.data ?? {
                reservationId: body.reservationId,
                ttlMs: body.ttlMs,
                claim: body.claim,
                serverTime: body.serverTime,
            };

            return res.status(statusCode).json({ success: true, data });
        }

        // === TƯƠNG THÍCH NGƯỢC VỚI KIỂU CŨ { ok } ===
        if (body.ok === true) {
            return res.status(statusCode).json({
                success: true,
                data: {
                    reservationId: body.reservationId,
                    ttlMs: body.ttlMs,
                    claim: body.claim,
                    serverTime: body.serverTime,
                },
            });
        }

        // === NHÁNH LỖI ===
        const errorCode = body.error || "INTERNAL";
        // nếu service trả về 2xx nhưng body không ok/success -> coi như lỗi 500
        const finalStatus = statusCode >= 400 ? statusCode : 500;
        return res
            .status(finalStatus)
            .json({ success: false, error: errorCode });
    };
}
