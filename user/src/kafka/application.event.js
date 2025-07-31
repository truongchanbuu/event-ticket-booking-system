import {
    APPLICATION_APPROVED,
    APPLICATION_EVENT,
    APPLICATION_PERMANENTLY_REJECTED,
    APPLICATION_REJECTED,
} from "@event_ticket_booking_system/shared";

export class ApplicationEventService {
    #sendApproved;
    #sendRejected;
    #sendPermanentlyRejected;

    constructor({ kafkaService }) {
        this.#sendApproved = kafkaService.createTopicSender(
            APPLICATION_EVENT,
            APPLICATION_APPROVED,
        );

        this.#sendRejected = kafkaService.createTopicSender(
            APPLICATION_EVENT,
            APPLICATION_REJECTED,
        );

        this.#sendPermanentlyRejected = kafkaService.createTopicSender(
            APPLICATION_EVENT,
            APPLICATION_PERMANENTLY_REJECTED,
        );
    }

    // Cung cấp các phương thức public rõ ràng
    async sendApplicationApproved(payload) {
        // payload là dữ liệu bạn muốn gửi, vd: { applicationId: 123, userId: 456 }
        return this.#sendApproved(payload);
    }

    async sendApplicationRejected(payload) {
        return this.#sendRejected(payload);
    }

    async sendApplicationPermanentlyRejected(payload) {
        return this.#sendPermanentlyRejected(payload);
    }
}
