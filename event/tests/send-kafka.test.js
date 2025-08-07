// Cài đặt: npm install kafkajs
import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "test-producer",
    brokers: ["localhost:9092"], // Thay đổi nếu broker của bạn ở địa chỉ khác
});

const producer = kafka.producer();

async function sendMessage(ticketId, eventId) {
    await producer.connect();

    const message = {
        type: "TICKET_TYPE_DELETED",
        payload: {
            ticketTypeId: ticketId || "ticket-001",
            eventId: eventId || "evt_default_test",
            name: `Test Ticket ${ticketId}`,
            description: "This is a test ticket.",
            price: 100000,
            currency: "USD",
            totalQuantity: 500,
        },
    };

    console.log("Sending message:", message);

    await producer.send({
        topic: "ticket.events", // Đảm bảo đúng tên topic
        messages: [{ value: JSON.stringify(message) }],
    });

    console.log("Message sent successfully!");
    await producer.disconnect();
}

// Lấy ID ticket từ dòng lệnh, ví dụ: node send-kafka-message.js test_ticket_001
const ticketIdFromArgs = process.argv[2];
if (!ticketIdFromArgs) {
    console.error("Please provide a ticket ID as an argument.");
    process.exit(1);
}

sendMessage(ticketIdFromArgs).catch(console.error);
