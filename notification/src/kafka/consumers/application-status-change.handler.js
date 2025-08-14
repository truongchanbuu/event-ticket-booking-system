// src/consumers/handlers/application_notification.handler.js
import { MESSAGE_CHANNEL } from '../../models/message-channel.js';

export class ApplicationNotificationHandler {
  /**
   * Constructor này nhận vào các dependency cần thiết VÀ
   * `eventType` để biết phải gửi loại thông báo nào.
   * @param {object} dependencies
   * @param {import('../../services/notification.service.js').NotificationService} dependencies.notificationService
   * @param {string} dependencies.eventType - Ví dụ: 'APPLICATION_APPROVED'.
   * @param {object} dependencies.logger
   */
  constructor({ notificationService, eventType, logger }) {
    if (!eventType) {
      throw new Error(
        'ApplicationNotificationHandler requires an eventType in its constructor.',
      );
    }
    this.notificationService = notificationService;
    this.eventType = eventType;
    this.logger = logger;
  }

  /**
   * Hàm xử lý chính. Logic giờ đây hoàn toàn chung chung.
   * @param {object} payload - Dữ liệu của message.
   */
  async handle(payload) {
    console.log(
      `Handling event [${this.eventType}] for application ID: ${payload.applicationId}`,
    );

    const templateVariables = {
      username: payload.username,
      email: payload.email,
      userId: payload.userID,
      applicationId: payload.applicationId,
      reason: payload.reason,
    };

    const channelsToNotify = [MESSAGE_CHANNEL.EMAIL, MESSAGE_CHANNEL.IN_APP];

    try {
      const promises = channelsToNotify.map((channel) =>
        this.notificationService.send(
          channel,
          this.eventType,
          templateVariables,
        ),
      );

      const results = await Promise.allSettled(promises);

      let hasError = false;
      results.forEach((result, index) => {
        const channel = channelsToNotify[index];
        if (result.status === 'rejected') {
          hasError = true;
          this.logger.error(`Failed to send notification via [${channel}]`, {
            reason: result.reason,
          });
        } else {
          this.logger.info(`Successfully sent notification via [${channel}]`);
        }
      });

      if (hasError) {
        throw new Error('One or more notification channels failed.');
      }
    } catch (error) {
      this.logger.error(
        `Critical error in notification handler for event [${this.eventType}]`,
        { error },
      );
      throw error;
    }
  }
}
