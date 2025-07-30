import kafkaService from "./KafkaService.js";
import { APPLICATION_EVENT } from "../constants/topics.js";
import {
    APPLICATION_APPROVED,
    APPLICATION_PERMANENTLY_REJECTED,
    APPLICATION_REJECTED,
} from "@event_ticket_booking_system/shared";

export const sendApplicationApprovedEvent = kafkaService.createTopicSender(
    APPLICATION_EVENT,
    APPLICATION_APPROVED,
);

// ===> SENDER MỚI CHO VIỆC TỪ CHỐI TẠM THỜI <===
export const sendApplicationRejectedEvent = kafkaService.createTopicSender(
    APPLICATION_EVENT,
    APPLICATION_REJECTED,
);

// ===> SENDER MỚI CHO VIỆC TỪ CHỐI VĨNH VIỄN <===
export const sendApplicationPermanentlyRejectedEvent =
    kafkaService.createTopicSender(
        APPLICATION_EVENT,
        APPLICATION_PERMANENTLY_REJECTED,
    );
