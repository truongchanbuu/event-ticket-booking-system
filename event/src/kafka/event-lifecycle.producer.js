import {
    EVENT_CANCELLED,
    EVENT_PUBLISHED,
    TOPICS,
} from "@event_ticket_booking_system/shared";

export class EventLifecycleEventService {
    constructor({ kafkaService, config }) {
        this.logger = console;
        const topic = config.kafka?.topics?.main_events || TOPICS.EVENT;
        this.topicSender = kafkaService.createTopicSender(
            topic,
            config.kafka.producer_name,
        );
        this.producerName = config.kafka?.producer_name || "event-service";
        this.schemaVersion = Number(config.kafka?.schemaVersion ?? 1);
    }

    _requireEventId(payload) {
        if (!payload?.eventId) {
            this.logger.warn("[Kafka] missing eventId in payload");
            return false;
        }
        return true;
    }

    async _send(type, key, payload, meta, headers) {
        const env = buildEnvelope({
            type,
            version: this.schemaVersion,
            payload,
            meta: { producer: this.producerName, ...meta },
        });

        return this.topicSender({
            eventType: type,
            key: String(key ?? ""),
            value: env,
            headers,
        });
    }

    async sendEventCancelled(payload, meta, headers) {
        if (!this._requireEventId(payload)) return;
        const enriched = {
            ...payload,
            action: "cancelled",
            cancelledAt: new Date().toISOString(),
        };
        return this._send(
            EVENT_CANCELLED,
            payload.eventId,
            enriched,
            meta,
            headers,
        );
    }

    async sendEventPublished(payload, meta, headers) {
        if (!this._requireEventId(payload)) return;
        const enriched = {
            ...payload,
            action: "published",
            publishedAt: new Date().toISOString(),
        };
        return this._send(
            EVENT_PUBLISHED,
            payload.eventId,
            enriched,
            meta,
            headers,
        );
    }

    // Tuỳ chọn: bật nếu cần sự kiện update
    // import { EVENT_UPDATED } từ shared nếu đã khai báo
    // async sendEventUpdated(payload, meta, headers) {
    //   if (!this._requireEventId(payload)) return;
    //   const enriched = {
    //     ...payload,
    //     action: "updated",
    //     updatedAt: new Date().toISOString(),
    //   };
    //   return this._send(EVENT_UPDATED, payload.eventId, enriched, meta, headers);
    // }
}
