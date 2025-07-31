export default function createSmsService({ config, logger }) {
  const smsLogger = logger.child({ service: 'SMS Service' });
  const client = require('twilio')(
    config.twilio_account_sid,
    config.twilio_auth_token,
  );

  return {
    send: async ({ to, message }) => {
      if (!to) {
        smsLogger.warn('⚠️ SMS not sent: Recipient phone number is missing.');
        return;
      }
      try {
        await client.messages.create({
          body: message,
          from: config.twilio_phone_number,
          to,
        });
        smsLogger.info(`💬 SMS sent successfully to ${to}.`);
      } catch (error) {
        smsLogger.error(`❌ Failed to send SMS to ${to}:`, error);
        throw error;
      }
    },
  };
}
