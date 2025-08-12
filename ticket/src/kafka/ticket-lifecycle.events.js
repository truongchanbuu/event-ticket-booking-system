import {
    TICKET_TYPE_CREATED,
    TICKET_TYPE_UPDATED,
    TICKET_TYPE_DELETED,
} from "@event_ticket_booking_system/shared";

export class TicketLifecycleEventService {
    constructor({ kafkaService, config, logger }) {
        this.logger = logger;

        const topic =
            config.kafka?.topics?.ticket_type_events || "ticket.events";

        this.topicSender = kafkaService.createTopicSender(
            topic,
            config.kafka.producerName,
        );
    }

    async sendTicketTypeCreated(payload) {
        const enrichedPayload = {
            ...payload,
            action: "created",
            createdAt: new Date().toISOString(),
        };

        const eventMessage = {
            type: TICKET_TYPE_CREATED,
            payload: enrichedPayload,
        };

        await this.topicSender({
            eventType: TICKET_TYPE_CREATED,
            key: payload.ticketTypeID,
            value: JSON.stringify(eventMessage),
        });
    }

    async sendTicketTypeUpdated(payload) {
        const enrichedPayload = {
            ...payload,
            action: "updated",
            updatedAt: new Date().toISOString(),
        };

        const eventMessage = {
            type: TICKET_TYPE_UPDATED,
            payload: enrichedPayload,
        };

        await this.topicSender({
            eventType: TICKET_TYPE_UPDATED,
            key: payload.ticketTypeID,
            value: JSON.stringify(eventMessage),
        });
    }

    async sendTicketTypeDeleted(payload) {
        const enrichedPayload = {
            ...payload,
            action: "deleted",
            deletedAt: new Date().toISOString(),
        };

        const eventMessage = {
            type: TICKET_TYPE_DELETED,
            payload: enrichedPayload,
        };

        await this.topicSender({
            eventType: TICKET_TYPE_DELETED,
            key: payload.ticketTypeID,
            value: JSON.stringify(eventMessage),
        });
    }
}
