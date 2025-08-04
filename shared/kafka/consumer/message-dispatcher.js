export class MessageDispatcher {
  constructor({ handlerMap, logger }) {
    this.handlerMap = handlerMap;
    this.logger = logger;
  }

  /**
   * Nhận message thô từ kafkajs và điều phối.
   * @param {object} rawMessage - Message thô từ `eachMessage` của kafkajs
   */
  async dispatch(data, scope) {
    const { topic, partition, message } = data;

    let messageValue;
    try {
      if (Buffer.isBuffer(message.value)) {
        messageValue = message.value.toString("utf8");
      } else if (
        typeof message.value === "object" &&
        message.value?.type === "Buffer"
      ) {
        messageValue = Buffer.from(message.value.data).toString("utf8");
      } else {
        messageValue = String(message.value);
      }
    } catch (err) {
      this.logger.error("Unable to decode message value", err);
      return;
    }

    console.log(`Received message from topic "${topic}"`, {
      partition,
      offset: message.offset,
    });

    try {
      const { type, payload } = JSON.parse(messageValue);

      if (!type) {
        console.warn('Message missing "type" field. Skipping.', {
          value: messageValue,
        });
        return;
      }

      const handlerName = this.handlerMap[type];
      if (!handlerName) {
        console.warn(
          `No handler registered for message type "${type}". Skipping.`
        );
        return;
      }

      const handler = scope.resolve(handlerName);

      console.info(
        `Dispatching message type "${type}" to handler "${handlerName}"`
      );
      await handler.handle(payload);
    } catch (error) {
      console.error("Error processing message, it will be retried.", {
        error: error.message,
        value: messageValue,
      });
      throw error;
    }
  }
}
