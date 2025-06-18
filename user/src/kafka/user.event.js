import { EVENT_TYPES, USER_EVENT } from "@event_ticket_booking_system/shared";
import { createTopicSender } from "@event_ticket_booking_system/shared/kafka/kafka.js";

const sendUserEvent = createTopicSender(
    USER_EVENT,
    "USER_EVENT",
    "user-service",
);

export const sendUserDeleted = (userData) =>
    sendUserEvent({
        key: userData.userID,
        value: { ...userData, deletedAt: new Date().toISOString() },
        eventType: EVENT_TYPES.USER_DELETED,
    });

export const sendUserRoleChanged = (userData) => {
    sendUserEvent({
        key: userData.userID,
        value: { ...userData, updatedAt: new Date().toISOString() },
        eventType: EVENT_TYPES.USER_ROLE_CHANGED,
    });
};
