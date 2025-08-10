export const TOPICS = Object.freeze({
  EVENT: process.env.KAFKA_TOPIC_EVENT_LIFECYCLE || "event.lifecycle.events",
  AVAILABILITY:
    process.env.KAFKA_TOPIC_AVAILABILITY || "event.availability.events",
  TICKET: process.env.KAFKA_TOPIC_TICKET || "ticket.lifecycle.events",
  ORDER: process.env.KAFKA_TOPIC_ORDER || "order.lifecycle.events",
  PAYMENT: process.env.KAFKA_TOPIC_PAYMENT || "payment.lifecycle.events",
  ATTENDEE: process.env.KAFKA_TOPIC_ATTENDEE || "attendee.lifecycle.events",
  APPLICATION:
    process.env.KAFKA_TOPIC_APPLICATION || "application.lifecycle.events",
  NOTIFICATION:
    process.env.KAFKA_TOPIC_NOTIFICATION || "notification.dispatch.events",
  AUDIT: process.env.KAFKA_TOPIC_AUDIT || "audit.log.events",
});
