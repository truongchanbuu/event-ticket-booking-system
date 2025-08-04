import fs from 'fs';
import path, { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {
  loadEmailTemplate,
  processJsonTemplateFile,
  processTemplate,
  registerHelpers,
} from '../utils/template.utils.js';
import { MESSAGE_CHANNEL } from '../models/message-channel.js';
import { fileURLToPath } from 'url';

export class NotificationService {
  constructor({
    templateConfig,
    emailService,
    inAppService,
    smsService,
    logger,
  }) {
    this.config = templateConfig;
    this.emailService = emailService;
    this.inAppService = inAppService;
    this.smsService = smsService;

    registerHelpers();
    console.log('[NotificationService] Handlebars helpers registered.');
  }

  /** @private */
  _prepareTemplateVariables(payloadVars = {}) {
    const resolved = { ...payloadVars };
    resolved.global = this.config.global;
    return resolved;
  }

  async send(channel, type, variables) {
    const typeConfig = this.config.notifications?.[type];
    if (!typeConfig) {
      throw new Error(`Missing notification type config: ${type}`);
    }

    const channelConfig = typeConfig[channel];
    if (!channelConfig) {
      this.logger.debug(
        `Channel "${channel}" is not defined for type "${type}". Skipping.`,
      );
      return;
    }

    const allVars = this._prepareTemplateVariables(variables);

    switch (channel) {
      case MESSAGE_CHANNEL.EMAIL:
        return this.sendEmail(channelConfig, allVars);
      case MESSAGE_CHANNEL.IN_APP:
        return this.sendInApp(channelConfig, allVars);
      case MESSAGE_CHANNEL.SMS:
        return this.sendSMS(channelConfig, allVars);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  async sendEmail(config, variables) {
    const srcDir = path.resolve(__dirname, '..', '..');

    const templateFile = path.join(
      srcDir,
      this.config.settings.template_directory,
      config.template_file,
    );

    if (!fs.existsSync(templateFile)) {
      throw new Error('❌ Template file not found: ' + templateFile);
    }

    const htmlTemplate = loadEmailTemplate(templateFile);
    const html = processTemplate(htmlTemplate, variables);
    const subject = processTemplate(config.subject, variables);

    try {
      await this.emailService.send({
        to: variables.email,
        from: processTemplate(variables.global.sender.email, variables),
        fromName: processTemplate(variables.global.sender.name, variables),
        subject,
        html,
      });
      console.log('✅ Email sent successfully to:', variables.email);
    } catch (err) {
      console.error('❌ Error sending email:', err);
    }
  }

  async sendInApp(config, variables) {
    if (!variables.userId) {
      throw new Error('❌ Missing userId in variables');
    }

    const srcDir = path.resolve(__dirname, '..', '..');
    const templateFile = path.join(
      srcDir,
      this.config.settings.template_directory,
      config.template_file,
    );

    console.log('📨 sendInApp called with config:', config);
    console.log('📨 sendInApp called with variables:', variables);

    if (!fs.existsSync(templateFile)) {
      throw new Error('❌ Template file not found: ' + templateFile);
    }

    try {
      const notification = processJsonTemplateFile(templateFile, variables);

      console.log('✅ Final notification payload:', notification);
      console.log(
        '[DEBUG] 📥 Calling inAppService.store for user:',
        variables.userId,
      );

      await this.inAppService.store(variables.userId, notification);
      console.log(`✅ In-App notification sent to user ${variables.userId}`);
    } catch (error) {
      console.error('❌ Error in sendInApp:', error);
      throw error; // Optional: Rethrow or handle gracefully
    }
  }

  async sendSMS(config, variables) {
    const message = processTemplate(config.template, variables);
    const maxLength = this.config.sms_settings?.max_length || 160;
    if (message.length > maxLength) {
      console.warn(
        `SMS message for type "${config.type}" exceeds max length.`,
        { length: message.length },
      );
    }

    await this.smsService.send({
      to: variables.phone,
      message,
    });
  }
}
