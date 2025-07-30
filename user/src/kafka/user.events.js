import { USER_EVENT } from "@event_ticket_booking_system/shared";
import kafkaService from "../services/kafka.service.js";

export const sendUserRegisteredEvent = kafkaService.createTopicSender(
    USER_EVENT,
    "UserRegistered",
);
export const sendUserProfileUpdatedEvent = kafkaService.createTopicSender(
    USER_EVENT,
    "UserProfileUpdated",
);
