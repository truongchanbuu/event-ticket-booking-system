/**
 * @param {{ db: FirebaseFirestore.Firestore, logger: import('winston').Logger }} deps
 */
export function createInAppService({ db, logger }) {
  const inAppLogger = logger.child({ service: 'InAppService' });

  return {
    /**
     * Store an in-app notification for a user
     * @param {string} userId
     * @param {{ title: string, body: string, type?: string }} data
     */
    async store(userId, data) {
      try {
        const notification = {
          ...data,
          createdAt: new Date(),
          read: false,
        };

        await db
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add(notification);

        inAppLogger.info(`📱 In-app notification stored for user ${userId}.`);
      } catch (error) {
        inAppLogger.error(
          `❌ Failed to store in-app notification for user ${userId}:`,
          error,
        );
      }
    },
  };
}
