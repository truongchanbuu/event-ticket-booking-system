export class PaymentSucceededHandler {
    constructor({ reservationService, redisService, logger = console }) {
        this.svc = reservationService;
        this.logger = logger;
        this.redis = redisService;
    }

    _dedupeKey(reservationId, paymentIntentId) {
        // nếu thiếu paymentIntentId thì dùng reservationId
        return `payment:processed:${reservationId}:${paymentIntentId || "no_pi"}`;
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

        // 1) Dedupe để tránh xử lý trùng
        try {
            const ok = await this.redis.setNXEx(
                this._dedupeKey(reservationId, paymentInfo.paymentIntentID),
                "1",
                24 * 3600, // 24h
                { jitter: false },
            );
            if (!ok) {
                this.logger.info("[PaymentSucceeded] duplicate ignored", {
                    reservationId,
                });
                return;
            }
        } catch (e) {
            this.logger.warn(
                "[PaymentSucceeded] dedupe setNXEx failed, proceeding",
                e?.message,
            );
        }

        // 2) Thử confirm “live hold” trước
        let confirmResp;
        try {
            confirmResp = await this.svc.confirmReservation({ reservationId });
            const state = confirmResp?.body?.state;
            const ok = confirmResp?.body?.ok === true && !state;

            if (ok) {
                this.logger.info(
                    "[PaymentSucceeded] committed via confirmReservation",
                    { reservationId },
                );
                return;
            }

            // Nếu hold đã hết / không còn → rẽ sang late-commit
            if (state === "HOLD_EXPIRED" || state === "ALREADY_CLEARED") {
                this.logger.info(
                    "[PaymentSucceeded] hold missing/expired → late commit",
                    {
                        reservationId,
                        state,
                    },
                );
            } else {
                // các case khác (PAYMENT_REQUIRED, CONFIRM_IN_PROGRESS, …) — log và dừng
                this.logger.warn(
                    "[PaymentSucceeded] unexpected confirm state",
                    {
                        reservationId,
                        confirmResp,
                    },
                );
                // tùy policy: có thể retry sau
                return;
            }
        } catch (e) {
            // lỗi confirm (network/transient) → vẫn thử late-commit như fallback
            this.logger.warn(
                "[PaymentSucceeded] confirmReservation failed → try late",
                {
                    reservationId,
                    err: e?.message,
                },
            );
        }

        // 3) Late commit từ snapshot + grace window
        try {
            const r = await this.svc.attemptLateCommitFromSnapshot({
                reservationId,
                paymentInfo,
            });
            if (r?.ok) {
                this.logger.info("[PaymentSucceeded] late-commit OK", {
                    reservationId,
                });
                return;
            }
            // nếu fail (OOS_REFUNDED/GRACE_EXPIRED_REFUNDED/ERROR), hàm đã tự refund nếu cần
            this.logger.warn("[PaymentSucceeded] late-commit failed", {
                reservationId,
                reason: r?.reason,
            });
        } catch (e) {
            this.logger.error("[PaymentSucceeded] late-commit error", {
                reservationId,
                err: e?.message,
            });
        }
    }
}
