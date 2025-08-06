export class CreateTicketTypeSnapshotUseCase {
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
     * Xử lý sự kiện TICKET_TYPE_CREATED.
     * @param {object} payload - Dữ liệu từ message Kafka.
     * @param {string} payload.ticketTypeId
     * @param {string} payload.eventId
     * @param {string} payload.name
     * @param {number} payload.price
     * @param {number} payload.quantity
     */
    async handle(payload) {
        const { ticketTypeId, eventId } = payload;

        this.logger.info(
            "Handling TICKET_TYPE_CREATED event for Firestore...",
            {
                ticketTypeId,
                eventId,
            },
        );

        try {
            const dataToStore = {
                name: payload.name,
                description: payload.description,
                price: payload.price,
                priceCurrency: payload.priceCurrency,
                totalQuantity: payload.totalQuantity,
                checkedInQuantity: 0,
                createdAt: new Date().toISOString(),
                ticketTypeID: ticketTypeId,
            };

            await this.ticketTypeSnapshotRepo.createOrUpdate(
                eventId,
                ticketTypeId,
                dataToStore,
            );

            this.logger.info(
                "✅ Successfully created ticket type snapshot in Firestore.",
                {
                    path: `events/${eventId}/ticketTypes/${ticketTypeId}`,
                },
            );
        } catch (error) {
            this.logger.error(
                "❌ Failed to create ticket type snapshot in Firestore.",
                {
                    error: error.message,
                    payload,
                },
            );
            throw error;
        }
    }
}
