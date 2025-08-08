import { AppError, ERROR_CODE } from "@event_ticket_booking_system/shared";

export class PublishTicketTypesSnapshotUseCase {
    constructor({ ticketService }) {
        this.ticketService = ticketService;
    }

    async handle(payload) {
        const { eventID, publishedAt } = payload;
        if (!eventID) {
            throw new AppError({
                message: "Invalid data",
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
            });
        }

        try {
            const result = await this.ticketService.publishTicketTypes({
                eventID,
                publishedAt,
            });

            console.log(`Ticket Types Results: ${JSON.stringify(result)}`);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
}
