import {
    AVAILABILITY_CHANGED,
    AVAILABILITY_SOLD_OUT,
    AVAILABILITY_RESTOCKED,
    TOPICS,
    buildEnvelope,
} from "@event_ticket_booking_system/shared";

export class AvailabilityProducer {
    constructor({ kafkaService, config, logger = console }) {
        this.logger = logger;

        const topic = config.kafka?.topics?.availability || TOPICS.AVAILABILITY;

        this.sendToTopic = kafkaService.createTopicSender(
            topic,
            config.kafka.producerName,
        );

        this.producerName = config.kafka?.producerName || "inventory-service";
        this.schemaVersion = 1;
    }

    async send(type, key, payload, meta) {
        const enrichedMeta = {
            producer: this.producerName,
            ...meta,
        };

        const record = {
            eventType: type,
            key: String(key ?? ""),
            value: buildEnvelope({
                type,
                payload,
                enrichedMeta,
                version: this.schemaVersion,
            }),
        };

        console.log(`send: ${record}`);

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
    async changed(payload, meta) {
        const enriched = {
            ...payload,
            action: "availability_changed",
            changedAt: new Date().toISOString(),
        };

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
