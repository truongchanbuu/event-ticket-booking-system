import nodemailer from 'nodemailer';

/**
 * Tạo email service có khả năng gửi mail qua SMTP
 * @param {object} emailConfig - { host, port, user, pass }
 * @returns {{ send: Function }}
 */
export function createEmailService({ logger, config }) {
  const emailLogger = logger.child({ service: 'EmailService' });

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || false,
    auth: config,
  });

  return {
    /**
     * Gửi email
     * @param {{ to: string, subject: string, html: string }} param0
     */
    send: async ({ to, subject, html }) => {
      if (!to) {
        emailLogger.warn('⚠️ Email not sent: missing recipient.');
        return;
      }

      try {
        const info = await transporter.sendMail({
          from: `"Event Ticket Booking System" <${config.user}>`,
          to,
          subject,
          html,
        });

        emailLogger.info(
          `📧 Email sent to ${to}. Message ID: ${info.messageId}`,
        );
      } catch (error) {
        emailLogger.error(`❌ Failed to send email to ${to}:`, error);
      }
    },
  };
}
