import { EVENT_CANCELLED } from "@event_ticket_booking_system/shared";

export class EventLifecycleEventService {
    /**
     * @param {object} dependencies
     * @param {import('./kafka.service').KafkaService} dependencies.kafkaService
     * @param {object} dependencies.config
     * @param {object} dependencies.logger
     */
    constructor({ kafkaService, config }) {
        const topic =
            config.kafka?.topics?.main_events || "event.lifecycle.events";

        this.topicSender = kafkaService.createTopicSender(
            topic,
            config.kafka.producer_name,
        );
    }

    /**
     * Gửi sự kiện khi một sự kiện bị hủy (EVENT_CANCELLED)
     * @param {object} payload - {
     *    eventId: string,
     *    cancelledBy: string,
     *    reason?: string
     * }
     */
    async sendEventCancelled(payload) {
        const enrichedPayload = {
            ...payload,
            action: "cancelled",
            cancelledAt: new Date().toISOString(),
        };

        const eventMessage = {
            type: EVENT_CANCELLED,
            payload: enrichedPayload,
        };

        await this.topicSender({
            eventType: EVENT_CANCELLED,
            key: payload.eventId,
            value: JSON.stringify(eventMessage), // Đảm bảo value được stringify nếu consumer yêu cầu
        });
    }

    /**
     * Gửi sự kiện khi một attendee được tạo
     * @param {object} payload - {
     *    attendeeID: string,
     *    purchaseID: string,
     *    eventID: string,
     *    email: string,
     *    displayName: string,
     *    manuallyCreated: boolean
     * }
     */
    async sendAttendeeCreated(payload) {
        const enrichedPayload = {
            ...payload,
            action: "created",
            createdAt: new Date().toISOString(),
        };

        const eventMessage = {
            type: ATTENDEE_CREATED,
            payload: enrichedPayload,
        };

        await this.topicSender({
            eventType: ATTENDEE_CREATED,
            key: payload.attendeeID,
            value: JSON.stringify(eventMessage),
        });
    }
}
