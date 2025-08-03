/**
 * Class xử lý sự kiện TICKET_TYPE_UPDATED để cập nhật snapshot trong Firestore.
 */
export class DeleteTicketTypeSnapshotUseCase {
    /**
     * @param {object} deps
     * @param {import('../../infra/repositories/ticket-type-snapshot-repository').ticketTypeSnapshotRepo} deps.ticketTypeSnapshotRepo
     * @param {object} deps.logger
     */
    constructor({ ticketTypeSnapshotRepo, logger }) {
        this.ticketTypeSnapshotRepo = ticketTypeSnapshotRepo;
        this.logger = logger;
    }

    /**
     * Xử lý sự kiện TICKET_TYPE_DELETED.
     * @param {object} payload
     * @param {string} payload.ticketTypeId
     * @param {string} payload.eventId
     * @param {string} [payload.name]
     * @param {string} [payload.description]
     * @param {number} [payload.price]
     * @param {string} [payload.priceCurrency]
     * @param {number} [payload.totalQuantity]
     */
    async handle(payload) {
        const { ticketTypeId, eventId } = payload;

        this.logger.info(
            "Handling TICKET_TYPE_DELETED event for Firestore...",
            {
                ticketTypeId,
                eventId,
            },
        );

        try {
            await this.ticketTypeSnapshotRepo.delete(eventId, ticketTypeId);
            this.logger.log(`✅ Deleted ticketType ${ticketTypeId}`);
        } catch (error) {
            this.logger.error("❌ Failed to update ticket type snapshot.", {
                error: error.message,
                payload,
            });
            throw error;
        }
    }
}
