import { updateHoldMetaKeepTtl, ttlRemainingMs } from "./utils/hold-meta.js";

export class PaymentCanceledHandler {
    constructor({
        redisClient,
        reservationService,
        config = {},
        logger = console,
    }) {
        this.redis = redisClient;
        this.reservationService = reservationService;
        this.cfg = config.payment?.autoCancel ?? {
            canceled: false,
            minTtlMs: 0,
        };
        this.logger = logger;
    }
    async handle(payload) {
        const reservationId = payload?.reservationID || payload?.reservationId;
        if (!reservationId) return;

        const meta = await updateHoldMetaKeepTtl(this.redis, reservationId, {
            lastStatus: "CANCELED",
            transactionId: payload?.transactionId || null,
            retryable: true,
        });
        if (!meta.exists) return;

        const left = ttlRemainingMs(meta.hold);
        const shouldCancel =
            Boolean(this.cfg.canceled) ||
            (this.cfg.minTtlMs && left < Number(this.cfg.minTtlMs));

        if (shouldCancel) {
            this.logger.info("[PaymentCanceled] auto-cancel", {
                reservationId,
                left,
            });
            await this.reservationService.cancelReservation({ reservationId });
        } else {
            this.logger.info("[PaymentCanceled] marked, keep hold", {
                reservationId,
                left,
            });
        }
    }
}
