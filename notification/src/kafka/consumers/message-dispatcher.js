export class MessageDispatcher {
  constructor({ handlerMap, logger }) {
    this.handlerMap = handlerMap;
    // this.logger = console;
  }

  /**
   * Nhận message thô từ kafkajs và điều phối.
   * @param {object} rawMessage - Message thô từ `eachMessage` của kafkajs
   */
  async dispatch(data, scope) {
    console.log(`DATA: ${JSON.stringify(data)}`);
    const { topic, partition, message } = data;
    console.log(
      `DISPATCHER: ${JSON.stringify(this.handlerMap)} - ${topic} - ${partition} - ${message}`,
    );
    const messageValue = message.value.toString();
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
          `No handler registered for message type "${type}". Skipping.`,
        );
        return;
      }

      const handler = scope.resolve(handlerName);

      console.info(
        `Dispatching message type "${type}" to handler "${handlerName}"`,
      );
      await handler.handle(payload);
    } catch (error) {
      console.error('Error processing message, it will be retried.', {
        error: error.message,
        value: messageValue,
      });
      throw error;
    }
  }
}
