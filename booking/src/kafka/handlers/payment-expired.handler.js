import { updateHoldMetaKeepTtl, ttlRemainingMs } from "./utils/hold-meta.js";

export class PaymentExpiredHandler {
    constructor({
        redisClient,
        reservationService,
        config = {},
        logger = console,
    }) {
        this.redis = redisClient;
        this.reservationService = reservationService;
        this.cfg = config.payment?.autoCancel ?? {
            expired: false,
            minTtlMs: 0,
        };
        this.logger = logger;
    }
    async handle(payload) {
        const reservationId = payload?.reservationID || payload?.reservationId;
        if (!reservationId) return;

        const meta = await updateHoldMetaKeepTtl(this.redis, reservationId, {
            lastStatus: "EXPIRED",
            transactionId: payload?.transactionId || null,
            requiresNewIntent: true,
            retryable: true,
        });
        if (!meta.exists) return;

        const left = ttlRemainingMs(meta.hold);
        const shouldCancel =
            Boolean(this.cfg.expired) ||
            (this.cfg.minTtlMs && left < Number(this.cfg.minTtlMs));

        if (shouldCancel) {
            this.logger.info("[PaymentExpired] auto-cancel", {
                reservationId,
                left,
            });
            await this.reservationService.cancelReservation({ reservationId });
        } else {
            this.logger.info("[PaymentExpired] marked, keep hold", {
                reservationId,
                left,
            });
        }
    }
}
