import {
    TOPICS,
    RESERVATION_CREATED,
    RESERVATION_EXPIRED,
    RESERVATION_CANCELLED,
    buildEnvelope,
} from "@event_ticket_booking_system/shared";

const EVT = {
    CREATED: RESERVATION_CREATED || "reservation.created.v1",
    EXPIRED: RESERVATION_EXPIRED || "reservation.expired.v1",
    CANCELLED: RESERVATION_CANCELLED || "reservation.cancelled.v1",
};

export class ReservationProducer {
    constructor({ kafkaService, config, logger = console }) {
        this.logger = logger;
        const topic =
            config?.kafka?.topics?.booking ||
            config?.kafka?.topics?.main_events ||
            TOPICS.BOOKING ||
            TOPICS.EVENT;

        this.topicSender = kafkaService.createTopicSender(
            topic,
            config?.kafka?.producerName || "booking-service",
        );

        this.producerName = config?.kafka?.producerName || "booking-service";
        this.schemaVersion = 1;
    }

    _send(type, key, payload, meta, headers) {
        const env = buildEnvelope({
            type,
            version: this.schemaVersion,
            payload,
            meta: { producer: this.producerName, ...meta },
        });

        return this.topicSender({
            eventType: type,
            key: String(key ?? payload?.reservationId ?? ""),
            value: env,
            headers,
        });
    }

    async sendReservationCreated(payload, meta, headers) {
        // payload: { reservationId, eventId, lines, expiresAt }
        if (!payload?.reservationId) {
            this.logger.warn("[Kafka] missing reservationId in payload");
            return;
        }
        return this._send(
            EVT.CREATED,
            payload.reservationId,
            payload,
            meta,
            headers,
        );
    }

    async sendReservationExpired(payload, meta, headers) {
        if (!payload?.reservationId) {
            this.logger.warn("[Kafka] missing reservationId in payload");
            return;
        }
        const enriched = {
            ...payload,
            action: "expired",
            expiredAt: new Date().toISOString(),
        };
        return this._send(
            EVT.EXPIRED,
            payload.reservationId,
            enriched,
            meta,
            headers,
        );
    }

    async sendReservationCancelled(payload, meta, headers) {
        if (!payload?.reservationId) {
            this.logger.warn("[Kafka] missing reservationId in payload");
            return;
        }
        const enriched = {
            ...payload,
            action: "cancelled",
            cancelledAt: new Date().toISOString(),
        };
        return this._send(
            EVT.CANCELLED,
            payload.reservationId,
            enriched,
            meta,
            headers,
        );
    }
}
