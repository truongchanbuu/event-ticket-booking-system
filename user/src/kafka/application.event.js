import {
    APPLICATION_EVENT,
    EVENT_TYPES,
} from "@event_ticket_booking_system/shared";
import { createTopicSender } from "@event_ticket_booking_system/shared/kafka/kafka.js";

const sendApplicationEvent = createTopicSender(
    APPLICATION_EVENT,
    "APPLICATION_EVENT",
    "user-service",
);

export const sendAppStatusChanged = (appData, eventType) =>
    sendApplicationEvent({
        key: appData.userID,
        value: { ...appData, updatedAt: new Date().toISOString() },
        eventType,
    });
