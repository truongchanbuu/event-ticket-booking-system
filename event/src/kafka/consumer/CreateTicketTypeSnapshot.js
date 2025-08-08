import { z } from "zod";

/**
 * Schema chuẩn cho sự kiện TICKET_TYPE_CREATED.
 * Gợi ý: để producer gửi kèm occurredAt/version/traceId trong headers.
 */
const TicketTypeCreatedSchema = z.object({
    ticketTypeID: z.string().min(1),
    eventID: z.string().min(1),
    name: z.string().min(1),
    price: z.number().nonnegative(), // nên là minor units (đồng)
    currency: z
        .string()
        .min(3)
        .max(3)
        .transform((s) => s.toUpperCase()),
    totalQuantity: z.number().int().nonnegative(),
    // optional, nhưng rất nên có để order/idem:
    version: z.number().int().nonnegative().optional(),
    occurredAt: z.string().datetime().optional(), // ISO
});

export class CreateTicketTypeSnapshotUseCase {
    /**
     * @param {object} deps
     * @param {import('../../infra/repositories/ticket-type-snapshot-repository').ticketTypeSnapshotRepo} deps.ticketTypeSnapshotRepo
     * @param {object} deps.logger
     */
    constructor({ ticketTypeSnapshotRepo, logger }) {
        this.repo = ticketTypeSnapshotRepo;
        this.logger = logger || console;
    }

    /**
     * @param {{ message: import('kafkajs').KafkaMessage, topic: string, partition: number }} ctx
     * ctx.message.headers có thể có x-message-id, x-trace-id, x-retry-attempt...
     */
    async handleKafka(ctx) {
        const { message, topic, partition } = ctx;
        const traceId = message.headers?.["x-trace-id"]?.toString();
        const messageId =
            message.headers?.["x-message-id"]?.toString() ||
            `${topic}:${partition}:${message.offset}`; // fallback

        let payload;
        try {
            const raw = JSON.parse(message.value?.toString() || "{}");
            const parsed = TicketTypeCreatedSchema.safeParse(raw);
            if (!parsed.success) {
                // ❗ Không nên retry: dữ liệu không hợp lệ
                this.logger.error("Drop non-retryable: invalid payload", {
                    messageId,
                    traceId,
                    topic,
                    partition,
                    offset: message.offset,
                    issues: parsed.error.flatten(),
                });
                // ném lỗi đặc biệt nếu bạn có cơ chế phân loại; còn không thì return để commit
                return;
            }
            payload = parsed.data;
        } catch (e) {
            // JSON hỏng → cũng non-retryable
            this.logger.error("Drop non-retryable: cannot parse JSON", {
                messageId,
                traceId,
                topic,
                partition,
                offset: message.offset,
                err: e.message,
            });
            return;
        }

        const {
            ticketTypeID,
            eventID,
            name,
            price,
            currency,
            totalQuantity,
            version,
            occurredAt,
        } = payload;
        this.logger.info("Handle TICKET_TYPE_CREATED", {
            messageId,
            traceId,
            ticketTypeID,
            eventID,
            topic,
            partition,
            offset: message.offset,
        });

        // ---- Idempotency & ordering guards ----
        // 1) Dedupe theo messageId
        const already = await this.repo.hasProcessedMessage(messageId);
        if (already) {
            this.logger.info("Skip duplicate message", {
                messageId,
                ticketTypeID,
                eventID,
            });
            return;
        }

        // 2) Chặn out-of-order (nếu có version hoặc occurredAt)
        // Repo nên lưu 'lastVersion' hoặc 'lastOccurredAt' để so sánh atomically.
        const snapshot = {
            name,
            price,
            currency,
            totalQuantity,
            checkedInQuantity: 0,
            ticketTypeID,
            // Để repo set serverTimestamp => tránh lệch giờ
            __useServerTimestamp: true,
            meta: {
                lastEventVersion: version ?? null,
                lastOccurredAt: occurredAt ?? null,
                lastMessageId: messageId,
            },
        };

        try {
            // Upsert có guard:
            // - nếu đã có doc với version mới hơn → NOOP
            // - nếu version null: so sánh occurredAt; nếu đều null: chấp nhận lần đầu
            await this.repo.upsertSnapshot(eventID, ticketTypeID, snapshot, {
                messageId,
                version,
                occurredAt,
            });

            // Lưu dấu đã xử lý (idempotency store), nên làm cùng transaction nếu Firestore cho phép
            await this.repo.markMessageProcessed(messageId, {
                eventID,
                ticketTypeID,
            });

            this.logger.info("✅ Snapshot created/updated", {
                eventID,
                ticketTypeID,
                messageId,
            });
        } catch (error) {
            // Lỗi hạ tầng/commit → cho retry
            this.logger.error("❌ Failed to upsert snapshot", {
                messageId,
                eventID,
                ticketTypeID,
                err: error.message,
            });
            throw error; // để KafkaService đẩy sang retry/DLQ
        }
    }
}
