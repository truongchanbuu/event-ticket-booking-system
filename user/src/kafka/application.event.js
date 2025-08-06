// TODO: cần test với hàm createTopic mới
import {
    APPLICATION_APPROVED,
    APPLICATION_REJECTED,
    APPLICATION_PERMANENTLY_REJECTED,
} from "@event_ticket_booking_system/shared";

export class ApplicationEventService {
    /**
     * @param {object} dependencies - DI
     * @param {import('./kafka.service').KafkaService} dependencies.kafkaService - Service Kafka hạ tầng.
     * @param {object} dependencies.config - Config của ứng dụng.
     * @param {object} dependencies.logger
     */
    constructor({ kafkaService, config, logger }) {
        this.kafkaService = kafkaService;
        this.logger = logger;

        this.topic =
            config.kafka?.topics?.application_events || "application.events";
    }

    /**
     * @private
     * Một hàm helper chung để đóng gói và gửi tất cả các sự kiện.
     * Đây là nơi duy nhất chứa logic tạo message chuẩn { type, payload }.
     * @param {string} type - Loại sự kiện (e.g., APPLICATION_APPROVED).
     * @param {string} key - Partition key cho Kafka (thường là ID của thực thể chính).
     * @param {object} payloadData - Dữ liệu nghiệp vụ "thô".
     */
    async #sendEvent(type, key, payloadData) {
        const eventMessage = {
            type: type,
            payload: payloadData,
        };

        this.logger.info(`Sending event [${type}] to topic [${this.topic}]`, {
            key,
        });

        await this.kafkaService.send(this.topic, [
            {
                key: key,
                value: JSON.stringify(eventMessage),
            },
        ]);
    }

    /**
     * Gửi sự kiện khi đơn được duyệt.
     * @param {object} payload - Chỉ chứa dữ liệu nghiệp vụ cần thiết.
     */
    async sendApplicationApproved(payload) {
        const enrichedPayload = {
            ...payload,
            action: "approved", // Thêm các trường thống nhất nếu cần
            approvedAt: new Date().toISOString(),
        };

        await this.#sendEvent(
            APPLICATION_APPROVED,
            payload.applicationId,
            enrichedPayload,
        );
    }

    /**
     * Gửi sự kiện khi đơn bị từ chối.
     * @param {object} payload - Chỉ chứa dữ liệu nghiệp vụ cần thiết.
     */
    async sendApplicationRejected(payload) {
        const enrichedPayload = {
            ...payload,
            action: "rejected",
            rejectedAt: new Date().toISOString(),
        };

        await this.#sendEvent(
            APPLICATION_REJECTED,
            payload.applicationId,
            enrichedPayload,
        );
    }

    /**
     * Gửi sự kiện khi đơn bị từ chối vĩnh viễn.
     * @param {object} payload - Chỉ chứa dữ liệu nghiệp vụ cần thiết.
     */
    async sendApplicationPermanentlyRejected(payload) {
        const enrichedPayload = {
            ...payload,
            action: "permanently_rejected",
            rejectedAt: new Date().toISOString(),
        };

        await this.#sendEvent(
            APPLICATION_PERMANENTLY_REJECTED,
            payload.applicationId,
            enrichedPayload,
        );
    }
}
