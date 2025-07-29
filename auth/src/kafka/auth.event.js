import {
    AUTH_EVENTS,
    USER_EVENT,
    EVENT_TYPES,
} from "@event_ticket_booking_system/shared";
import { KafkaManager } from "@event_ticket_booking_system/shared";

// Create topic sender for user events
const sendAuthEvents = KafkaManager.createTopicSender(
    AUTH_EVENTS,
    "AUTH_EVENTS",
    "auth-service",
);

export const sendTokenRevoked = (data) =>
    sendAuthEvents({
        key: userData.userID,
        value: data,
        eventType: EVENT_TYPES.TOKEN_REVOKED,
    });

// Create topic sender for user events
const sendUserEvent = KafkaManager.createTopicSender(
    USER_EVENT,
    "USER_EVENT",
    "user-service",
);

/**
 * Send user deleted event
 * @param {Object} userData - User data to send
 */
export const sendUserDeleted = (userData) =>
    sendUserEvent({
        key: userData.userID,
        value: { ...userData, deletedAt: new Date().toISOString() },
        eventType: EVENT_TYPES.USER_DELETED,
    });
