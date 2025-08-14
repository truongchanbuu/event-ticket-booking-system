// payment.producer.ts (PATCH)
import {
  TOPICS,
  buildEnvelope,
  PAYMENT_SUCCEEDED,
  PAYMENT_FAILED,
  PAYMENT_CANCELED,
  PAYMENT_EXPIRED,
  PAYMENT_STATUS_UPDATED,
} from '@event_ticket_booking_system/shared';

export class PaymentProducer {
  constructor({ kafkaService, config, logger = console }) {
    this.logger = logger;
    const topic = (config?.kafka?.topics?.payments ?? TOPICS?.PAYMENTS) || 'payments';
    this.sendToTopic = kafkaService.createTopicSender(topic, config?.kafka?.producerName);
    this.producerName = config?.kafka?.producerName || 'payment-service';
    this.schemaVersion = 1;
  }

  keyOf(payload) {
    return String(payload?.paymentIntentID || payload?.reservationID || payload?.orderId || '') || '';
  }

  async send(type, key, payload, meta) {
    const env = buildEnvelope({
      type,
      version: this.schemaVersion,
      payload,
      meta: { producer: this.producerName, ...(meta || {}) },
    });

    try {
      return await this.sendToTopic({
        eventType: type,
        key: String(key ?? ''),
        value: env, // object; KafkaService sẽ stringify
      });
    } catch (err) {
      this.logger.error('[Kafka] payment send failed', { type, key, err: err?.message });
      throw err;
    }
  }

  async succeeded(payload, meta) {
    const enriched = { ...payload, action: 'payment_succeeded', occurredAt: new Date().toISOString() };
    return this.send(PAYMENT_SUCCEEDED, this.keyOf(payload), enriched, meta);
  }
  async failed(payload, meta) {
    const enriched = { ...payload, action: 'payment_failed', occurredAt: new Date().toISOString() };
    return this.send(PAYMENT_FAILED, this.keyOf(payload), enriched, meta);
  }
  async canceled(payload, meta) {
    const enriched = { ...payload, action: 'payment_canceled', occurredAt: new Date().toISOString() };
    return this.send(PAYMENT_CANCELED, this.keyOf(payload), enriched, meta);
  }
  async expired(payload, meta) {
    const enriched = { ...payload, action: 'payment_expired', occurredAt: new Date().toISOString() };
    return this.send(PAYMENT_EXPIRED, this.keyOf(payload), enriched, meta);
  }
  async statusUpdated(payload, meta) {
    const enriched = { ...payload, action: 'payment_status_updated', occurredAt: new Date().toISOString() };
    return this.send(PAYMENT_STATUS_UPDATED, this.keyOf(payload), enriched, meta);
  }
}
