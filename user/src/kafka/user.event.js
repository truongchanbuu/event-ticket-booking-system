import { EVENT_TYPES, USER_EVENT } from "@event_ticket_booking_system/shared";
import { KafkaManager } from "@event_ticket_booking_system/shared";

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

/**
 * Send user role changed event
 * @param {Object} userData - User data to send
 */
export const sendUserRoleChanged = (userData) => {
    sendUserEvent({
        key: userData.userID,
        value: { ...userData, updatedAt: new Date().toISOString() },
        eventType: EVENT_TYPES.USER_ROLE_CHANGED,
    });
};

/**
 * Send user created event
 * @param {Object} userData - User data to send
 */
export const sendUserCreated = (userData) => {
    sendUserEvent({
        key: userData.userID,
        value: { ...userData, createdAt: new Date().toISOString() },
        eventType: EVENT_TYPES.USER_CREATED,
    });
};

/**
 * Send user updated event
 * @param {Object} userData - User data to send
 */
export const sendUserUpdated = (userData) => {
    sendUserEvent({
        key: userData.userID,
        value: { ...userData, updatedAt: new Date().toISOString() },
        eventType: EVENT_TYPES.USER_UPDATED,
    });
};
