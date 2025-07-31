// notification-service.ts
import smsService from './sms.service.js';
import emailService from './email.service.js';
import inAppService from './in_app.service.js';
import {
  loadEmailTemplate,
  processTemplate,
  registerHelpers,
} from '../utils/template.utils.js';

class NotificationService {
  constructor(configFile, services = {}) {
    this.config = configFile;

    // Inject services (DI pattern)
    this.smsService = services.smsService || smsService;
    this.emailService = services.emailService || emailService;
    this.inAppService = services.inAppService || inAppService;

    registerHelpers();
  }

  /**
   * Gửi một notification theo channel và type
   * @param {'email'|'sms'|'in_app'} channel
   * @param {string} type - template key (ví dụ: 'user_registered')
   * @param {Object} variables - các biến truyền vào template
   */
  async send(channel, type, variables) {
    const channelHandlers = {
      [MESSAGE_CHANNEL.SMS]: this.sendSMS.bind(this),
      [MESSAGE_CHANNEL.EMAIL]: this.sendEmail.bind(this),
      [MESSAGE_CHANNEL.IN_APP]: this.sendInApp.bind(this),
    };

    const handler = channelHandlers[channel];
    if (!handler) {
      throw new Error(`Unsupported channel: ${channel}`);
    }

    const typeConfig = this.config.templates?.[type];
    if (!typeConfig) {
      throw new Error(`Missing notification type: ${type}`);
    }

    const channelConfig = typeConfig[channel];
    if (!channelConfig) {
      throw new Error(
        `Missing template config for channel "${channel}" in type "${type}"`,
      );
    }

    return handler(channelConfig, variables);
  }

  async sendSMS(config, variables) {
    const message = processTemplate(config.template, variables);
    const maxLength = this.config.sms_settings?.max_length || 160;
    if (message.length > maxLength) {
      throw new Error(`SMS message too long: ${message.length}`);
    }

    await this.smsService.send({
      to: variables.phone,
      message,
    });

    return { message };
  }

  async sendEmail(config, variables) {
    const subject = processTemplate(config.subject, variables);
    const templateFile = path.resolve('templates/email', config.template_file);
    const html = processTemplate(loadEmailTemplate(templateFile), variables);

    await this.emailService.send({
      to: variables.email,
      subject,
      html,
    });

    return { subject, html };
  }

  async sendInApp(config, variables) {
    const notification = {
      type: config.type || 'info',
      title: processTemplate(config.title, variables),
      message: processTemplate(config.message, variables),
      icon: config.icon,
      color: config.color
        ? processTemplate(config.color, variables)
        : undefined,
      dismissible: config.dismissible ?? true,
      auto_hide: config.auto_hide ?? false,
      actions: config.actions?.map((action) => ({
        ...action,
        target: processTemplate(action.target, variables),
      })),
      metadata: config.metadata
        ? Object.fromEntries(
            Object.entries(config.metadata).map(([k, v]) => [
              k,
              processTemplate(v, variables),
            ]),
          )
        : undefined,
    };

    await this.inAppService.store(variables.user_id, notification);
    return notification;
  }
}
