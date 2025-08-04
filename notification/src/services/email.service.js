// file: src/services/email.service.js
import { Resend } from 'resend';

export class EmailService {
  #resend;
  #logger;
  #defaultFrom;

  /**
   * @param {object} dependencies - DI
   * @param {object} dependencies.config - Config từ process.env
   * @param {object} dependencies.logger
   */
  constructor({ config, templateConfig, logger }) {
    this.#logger = console;

    const apiKey = config.email.resend?.apiKey;
    if (!apiKey) {
      this.#logger.error(
        '[EmailService] Resend API key is missing. Email sending will be disabled.',
      );
      return;
    }

    this.#resend = new Resend(apiKey);

    // Lấy địa chỉ email gửi mặc định từ config
    this.#defaultFrom =
      templateConfig.global.sender.email || 'noreply@yourdomain.com';
  }

  /**
   * Gửi email sử dụng Resend.
   * @param {{ to: string, fromName?: string, fromAddress?: string, subject: string, html: string }} options
   */
  async send(options) {
    if (!this.#resend) {
      this.#logger.error(
        '[EmailService] Cannot send email, service is not initialized (missing API key).',
      );
      throw new Error('EmailService is not configured.');
    }

    let { to, fromName, fromAddress, subject, html } = options;

    const from = `"${fromName || 'EventHub'}" <${fromAddress || this.#defaultFrom}>`;

    this.#logger.log(
      `[EmailService] Attempting to send email via Resend to: ${to} from ${from}`,
    );

    // TODO: TEST ONLY
    if (process.env.NODE_ENV === 'development') {
      to = 'truongbuu1593@gmail.com';
    }

    try {
      const { data, error } = await this.#resend.emails.send({
        from: from,
        to: [to],
        subject: subject,
        html: html,
      });

      if (error) {
        this.#logger.error(
          '[EmailService] FAILED to send email via Resend (API error).',
          { error },
        );
        throw new Error(error.message);
      }

      this.#logger.log('[EmailService] Email sent successfully via Resend!', {
        messageId: data.id,
      });
      return data;
    } catch (error) {
      this.#logger.error(
        '[EmailService] FAILED to send email via Resend (Transport error).',
        {
          errorMessage: error.message,
        },
      );
      throw error; // Ném lại lỗi để hệ thống biết
    }
  }
}
