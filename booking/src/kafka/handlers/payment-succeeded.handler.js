export class PaymentSucceededHandler {
    constructor({ reservationService, redisService, logger = console }) {
        this.reservationService = reservationService;
        this.logger = logger;
        this.redis = redisService;
    }

    async handle(payload) {
        const reservationId = payload?.reservationID || payload?.reservationId;
        if (!reservationId) return;

        const paymentInfo = {
            paymentIntentID:
                payload?.paymentIntentID || payload?.paymentIntentId || null,
            amount: Number(payload?.amount) || null,
            currency: payload?.currency || "VND",
            transactionId: payload?.transactionId || null,
        };
        const hasHold = await this.redis.exists(`hold:${reservationId}`);
        if (hasHold) {
            this.logger.info("[PaymentSucceeded] confirming (live hold)", {
                reservationId,
            });
            await this.svc.confirmReservation({ reservationId });
            return;
        }
        +(
            // late payment path
            this.logger.info(
                "[PaymentSucceeded] late payment → attempt from snapshot",
                {
                    reservationId,
                },
            )
        );
        await this.svc.attemptLateCommitFromSnapshot({
            reservationId,
            paymentInfo,
        });
    }
}
