import { ttlRemainingMs, updateHoldMetaKeepTtl } from "../utils/utils.js";

export class PaymentFailedHandler {
    constructor({
        redisClient,
        reservationService,
        config = {},
        logger = console,
    }) {
        this.redis = redisClient;
        this.reservationService = reservationService;
        this.cfg = config.payment?.autoCancel ?? { failed: false, minTtlMs: 0 };
        this.logger = logger;
    }
    async handle(payload) {
        const reservationId = payload?.reservationID || payload?.reservationId;
        const reason = payload?.reason || payload?.failureCode || null;
        if (!reservationId) return;

        const meta = await updateHoldMetaKeepTtl(this.redis, reservationId, {
            lastStatus: "FAILED",
            reason,
            transactionId: payload?.transactionId || null,
            retryable: true, // đa số lỗi có thể thử lại
        });
        if (!meta.exists) return;

        const left = ttlRemainingMs(meta.hold);
        const shouldCancel =
            Boolean(this.cfg.failed) ||
            (this.cfg.minTtlMs && left < Number(this.cfg.minTtlMs));

        if (shouldCancel) {
            this.logger.info("[PaymentFailed] auto-cancel", {
                reservationId,
                left,
            });
            await this.reservationService.cancelReservation({ reservationId });
        } else {
            this.logger.info("[PaymentFailed] marked, keep hold", {
                reservationId,
                left,
            });
        }
    }
}
