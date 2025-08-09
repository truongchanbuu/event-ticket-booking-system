export class CreateTicketTypeSnapshotUseCase {
    constructor({ ticketTypeSnapshotRepo, logger }) {
        this.ticketTypeSnapshotRepo = ticketTypeSnapshotRepo;
        this.logger = logger;
    }

    /**
     * Xử lý sự kiện TICKET_TYPE_CREATED.
     * @param {object} payload - Dữ liệu từ message Kafka.
     * @param {string} payload.ticketTypeID
     * @param {string} payload.eventID
     * @param {string} payload.name
     * @param {number} payload.price
     * @param {number} payload.quantity
     */
    async handle(payload) {
        const { ticketTypeID, eventID } = payload;

        this.logger.info(
            "Handling TICKET_TYPE_CREATED event for Firestore...",
            {
                ticketTypeID,
                eventID,
            },
        );

        try {
            const dataToStore = {
                name: payload.name,
                price: payload.price,
                currency: payload.currency,
                totalQuantity: payload.totalQuantity,
                checkedInQuantity: 0,
                createdAt: new Date().toISOString(),
                ticketTypeID: ticketTypeID,
            };

            await this.ticketTypeSnapshotRepo.createOrUpdate(
                eventID,
                ticketTypeID,
                dataToStore,
            );

            this.logger.info(
                "✅ Successfully created ticket type snapshot in Firestore.",
                {
                    path: `events/${eventID}/ticketTypes/${ticketTypeID}`,
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
