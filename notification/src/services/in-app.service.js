/**
 * @param {{ db, logger }} deps
 */
export function createInAppService({ db, logger }) {
  const inAppLogger = console;

  return {
    /**
     * Store an in-app notification for a user
     * @param {string} userId
     * @param {{ title: string, body: string, type?: string }} data
     */
    async store(userId, notificationPayload) {
      try {
        inAppLogger.log('🔔 Storing notification for userId:', userId);
        inAppLogger.log(
          '📦 Notification raw data:',
          JSON.stringify(notificationPayload),
        );

        if (!userId) {
          throw new Error('❌ userId is missing');
        }

        if (!notificationPayload.title || !notificationPayload.message) {
          throw new Error('❌ Missing title or message in notification data');
        }

        const notificationToStore = {
          ...notificationPayload,
          read: false,
          createdAt: new Date().toISOString(),
        };

        inAppLogger.log('📄 Final notification object:', notificationToStore);

        const docRef = await db
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add(notificationToStore);

        inAppLogger.log(
          `✅ In-app notification stored: docId=${docRef.id}, userId=${userId}, type=${notificationToStore.type}`,
        );
      } catch (error) {
        inAppLogger.error(
          `❌ Failed to store in-app notification for userId=${userId}: ${error.message}`,
          { error },
        );
        throw error;
      }
    },
  };
}
