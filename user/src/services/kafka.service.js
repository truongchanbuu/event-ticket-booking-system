import KafkaService from "@event_ticket_booking_system/shared/kafka/kafka.service.js";
import config from "../config/index.js";

const kafkaService = new KafkaService(config.kafka);
export default kafkaService;
