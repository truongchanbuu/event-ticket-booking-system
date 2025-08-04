/**
 * Class xử lý sự kiện TICKET_TYPE_UPDATED để cập nhật snapshot trong Firestore.
 */
export class UpdateTicketTypeSnapshotUseCase {
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
     * Xử lý sự kiện TICKET_TYPE_UPDATED.
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
            "Handling TICKET_TYPE_UPDATED event for Firestore...",
            {
                ticketTypeId,
                eventId,
            },
        );

        try {
            const existingSnapshot = await this.ticketTypeSnapshotRepo.getById(
                eventId,
                ticketTypeId,
            );

            const updatedSnapshot = {
                ...(existingSnapshot || {}),
                ...(payload.name && { name: payload.name }),
                ...(payload.description && {
                    description: payload.description,
                }),
                ...(payload.price && { price: payload.price }),
                ...(payload.priceCurrency && {
                    priceCurrency: payload.priceCurrency,
                }),
                ...(payload.totalQuantity && {
                    totalQuantity: payload.totalQuantity,
                }),
                updatedAt: new Date().toISOString(),
                ticketTypeId: existingSnapshot?.ticketTypeId ?? ticketTypeId,
            };

            await this.ticketTypeSnapshotRepo.createOrUpdate(
                eventId,
                ticketTypeId,
                updatedSnapshot,
            );

            this.logger.info("✅ Successfully updated ticket type snapshot.", {
                path: `events/${eventId}/ticketTypes/${ticketTypeId}`,
            });
        } catch (error) {
            this.logger.error("❌ Failed to update ticket type snapshot.", {
                error: error.message,
                payload,
            });
            throw error;
        }
    }
}
