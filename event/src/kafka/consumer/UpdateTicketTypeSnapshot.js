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
     * @param {string} payload.ticketTypeID
     * @param {string} payload.eventID
     * @param {string} [payload.name]
     * @param {string} [payload.description]
     * @param {number} [payload.price]
     * @param {string} [payload.currency]
     * @param {number} [payload.totalQuantity]
     */
    async handle(payload) {
        const { ticketTypeID, eventID } = payload;

        this.logger.info(
            "Handling TICKET_TYPE_UPDATED event for Firestore...",
            {
                ticketTypeID,
                eventID,
                ...payload,
            },
        );

        try {
            const existingSnapshot = await this.ticketTypeSnapshotRepo.getById(
                eventID,
                ticketTypeID,
            );

            const updatedSnapshot = {
                ...(existingSnapshot || {}),
                ...(payload.name && { name: payload.name }),
                ...(payload.price && { price: payload.price }),
                ...(payload.currency && {
                    currency: payload.currency,
                }),
                ...(payload.totalQuantity && {
                    totalQuantity: payload.totalQuantity,
                }),
                updatedAt: new Date().toISOString(),
                ticketTypeID: existingSnapshot?.ticketTypeID ?? ticketTypeID,
            };

            await this.ticketTypeSnapshotRepo.createOrUpdate(
                eventID,
                ticketTypeID,
                updatedSnapshot,
            );

            this.logger.info("✅ Successfully updated ticket type snapshot.", {
                path: `events/${eventID}/ticketTypes/${ticketTypeID}`,
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
