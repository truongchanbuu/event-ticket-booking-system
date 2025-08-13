/**
 * AutoCancelWorker
 * ----------------
 * Quét ZSET "auto_cancel:due" để hủy (close) reservation sau khi hết grace window.
 * Chính sách:
 * - Nếu payment=SUCCEEDED tại thời điểm tick → thử commit muộn từ snapshot (attemptLateCommitFromSnapshot)
 * - Nếu chưa SUCCEEDED → dọn snapshot + bỏ lịch. (tuỳ chọn: hủy order nếu đã tạo; publish Cancelled nếu bạn muốn)
 *
 * Yêu cầu DI:
 *  - redisService: Redis adapter (có set/get/pttl/zrangebyscore/zrem/del/setex/exists)
 *  - reservationService: có hàm attemptLateCommitFromSnapshot({ reservationId, paymentInfo })
 *  - paymentClient: có confirm({ reservationID, refresh:true })
 *  - reservationProducer (optional): để publish ReservationCancelled (cause=auto-cancel)
 *  - config:
 *      reservation.autoCancel.enabled (default true)
 *      autoCancel.tickMs (default 1500)
 *      autoCancel.batchSize (default 300)
 *      autoCancel.lockTtl (default 10)
 */
export class AutoCancelWorker {
    constructor({
        redisService,
        reservationService,
        paymentClient,
        reservationProducer,
        logger = console,
        config = {},
    }) {
        this.redis = redisService;
        this.svc = reservationService;
        this.payment = paymentClient;
        this.producer = reservationProducer;
        this.logger = logger;

        this.tickMs = Number(config?.autoCancel?.tickMs ?? 1500);
        this.batchSize = Number(config?.autoCancel?.batchSize ?? 300);
        this.lockTtl = Number(config?.autoCancel?.lockTtl ?? 10);
        this.enabled = Boolean(config?.autoCancel?.enabled ?? true);
        this.timer = null;
    }

    start() {
        if (!this.enabled) {
            this.logger.info("[auto-cancel] disabled by config");
            return;
        }
        if (this.timer) return;

        this.logger.info("[auto-cancel] starting…", {
            tickMs: this.tickMs,
            batchSize: this.batchSize,
        });

        this.timer = setInterval(
            () =>
                this._tick().catch((e) => {
                    this.logger.warn("[auto-cancel.tick] error", e?.message);
                }),
            this.tickMs,
        );
        this.timer.unref?.();
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    async _tick() {
        const now = Date.now();
        const dueIds = await this.redis.zrangebyscore(
            "auto_cancel:due",
            0,
            now,
            "LIMIT",
            0,
            this.batchSize,
        );
        if (!dueIds?.length) return;

        let processed = 0;
        let committed = 0;
        let closed = 0;
        const started = Date.now();

        for (const reservationId of dueIds) {
            const lockKey = `lock:auto_cancel:${reservationId}`;

            const got = await this.redis.setNXEx(lockKey, "1", this.lockTtl, {
                jitter: false,
            });
            if (!got) continue;

            try {
                processed++;

                // Snapshot còn không? Nếu không còn thì chỉ cần dọn zset
                const snapKey = `reservation:expired:${reservationId}`;
                const hasSnapshot = await this.redis.exists(snapKey);
                if (!hasSnapshot) {
                    await this.redis.zrem("auto_cancel:due", reservationId);
                    continue;
                }

                // 1) Confirm thanh toán (ép refresh)
                let status = "UNKNOWN";
                let paymentInfo = null;

                if (this.payment?.confirm) {
                    try {
                        const r = await this.payment.confirm({
                            reservationID: reservationId,
                            refresh: true,
                        });
                        status = r?.data?.status || "UNKNOWN";
                        paymentInfo = r?.data || null;
                    } catch (e) {
                        // Lỗi xác nhận provider → giữ snapshot để tick sau thử lại
                        this.logger.warn("[auto-cancel.confirm] failed", {
                            reservationId,
                            err: e?.message,
                        });
                        continue;
                    }
                }

                if (status === "SUCCEEDED") {
                    // Late payment → thử commit từ snapshot (hàm này tự kiểm tra quá limit grace hay không & refund khi cần)
                    const r = await this.svc.attemptLateCommitFromSnapshot({
                        reservationId,
                        paymentInfo,
                    });
                    if (r?.ok) {
                        committed++;
                    } else {
                        // Nếu quá hạn hoặc hết hàng → attemptLateCommitFromSnapshot đã tự refund (nếu có).
                        // Dọn snapshot & lịch (best-effort).
                        await Promise.allSettled([
                            this.redis.del(snapKey),
                            this.redis.zrem("auto_cancel:due", reservationId),
                        ]);
                        closed++;
                    }
                } else {
                    // 2) Không SUCCEEDED → xem như đóng ca (close state)
                    await Promise.allSettled([
                        this.redis.del(snapKey),
                        this.redis.zrem("auto_cancel:due", reservationId),
                    ]);

                    // (tuỳ chọn) Nếu có OrderService cancel thì gọi:
                    // await this.svc.orders?.cancelByReservationId?.(reservationId, { reason: "AUTO_CANCEL_GRACE_ELAPSED" }).catch(()=>{});

                    // (tuỳ chọn) publish ReservationCancelled với cause=auto-cancel
                    try {
                        await this.producer?.sendReservationCancelled?.(
                            { reservationId, cause: "auto-cancel" },
                            { source: "booking-service" },
                        );
                    } catch (e) {
                        this.logger.warn(
                            "[auto-cancel.publish.cancel] failed",
                            {
                                reservationId,
                                err: e?.message,
                            },
                        );
                    }

                    closed++;
                }
            } finally {
                await this.redis.del(lockKey);
            }
        }

        const dur = Date.now() - started;
        this.logger.info("[auto-cancel] tick", {
            processed,
            committed,
            closed,
            durMs: dur,
        });
    }
}
