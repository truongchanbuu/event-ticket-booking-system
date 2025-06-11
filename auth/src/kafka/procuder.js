import kafka from "./kafka.js";

const producer = kafka.producer();

export async function initProducer() {
    await producer.connect();
}

export async function sendKafkaMessage({ topic, key, value }) {
    await producer.send({
        topic,
        messages: [
            {
                key,
                value: JSON.stringify(value),
            },
        ],
    });
}

export default producer;
