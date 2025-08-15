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
}
