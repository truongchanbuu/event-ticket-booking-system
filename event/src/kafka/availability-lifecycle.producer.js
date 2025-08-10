import {
    AVAILABILITY_CHANGED,
    AVAILABILITY_SOLD_OUT,
    AVAILABILITY_RESTOCKED,
    TOPICS,
    buildEnvelope,
} from "@event_ticket_booking_system/shared"; // hoặc shared/messaging/event-types

export class AvailabilityProducer {
    constructor({ kafkaService, config, logger = console }) {
        this.logger = logger;

        const topic = config.kafka?.topics?.availability || TOPICS.AVAILABILITY;

        this.sendToTopic = kafkaService.createTopicSender(
            topic,
            config.kafka.producer_name,
        );

        this.producerName = config.kafka?.producer_name || "inventory-service";
        this.schemaVersion = 1;
    }

    async send(type, key, payload, meta) {
        const record = {
            eventType: type,
            key: String(key ?? ""),
            value: JSON.stringify(buildEnvelope(type, payload, meta)),
        };
        try {
            return await this.sendToTopic(record);
        } catch (err) {
            this.logger.error("[Kafka] availability send failed", {
                type,
                key,
                err: err?.message,
            });
            throw err;
        }
    }

    // ---------- API ----------
    /**
     * Gửi khi tồn kho thay đổi (reserve/release)
     * @param {{eventId:string, ticketTypeId:string, remaining:number, op:"reserve"|"release"}} payload
     */
    async changed(payload, meta) {
        const enriched = {
            ...payload,
            action: "availability_changed",
            changedAt: new Date().toISOString(),
        };
        // partition theo eventId để giữ thứ tự theo event
        return this.send(AVAILABILITY_CHANGED, payload.eventId, enriched, meta);
    }

    /**
     * Gửi khi một ticket type hết vé
     * @param {{eventId:string, ticketTypeId:string}} payload
     */
    async soldOut(payload, meta) {
        const enriched = {
            ...payload,
            action: "availability_sold_out",
            changedAt: new Date().toISOString(),
        };
        return this.send(
            AVAILABILITY_SOLD_OUT,
            payload.eventId,
            enriched,
            meta,
        );
    }

    /**
     * Gửi khi bổ sung tồn kho
     * @param {{eventId:string, ticketTypeId:string, remaining:number}} payload
     */
    async restocked(payload, meta) {
        const enriched = {
            ...payload,
            action: "availability_restocked",
            changedAt: new Date().toISOString(),
        };
        return this.send(
            AVAILABILITY_RESTOCKED,
            payload.eventId,
            enriched,
            meta,
        );
    }
}
