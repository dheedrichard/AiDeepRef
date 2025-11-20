/**
 * SendGrid Email Provider
 *
 * Implements email sending using SendGrid API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { BaseEmailProvider } from './base-email-provider';
import {
  EmailOptions,
  EmailSendResult,
  EmailProvider,
} from '../interfaces/email.interfaces';

@Injectable()
export class SendGridProvider extends BaseEmailProvider {
  protected readonly logger = new Logger(SendGridProvider.name);
  protected readonly provider = EmailProvider.SENDGRID;
  private readonly apiKey: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('SENDGRID_API_KEY', '');
    this.isConfigured = !!this.apiKey;

    if (this.isConfigured) {
      sgMail.setApiKey(this.apiKey);
      this.logger.log('SendGrid provider initialized');
    } else {
      this.logger.warn('SendGrid API key not configured');
    }
  }

  /**
   * Send email via SendGrid
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.isConfigured) {
      return this.createErrorResult('SendGrid not configured');
    }

    const recipient = Array.isArray(options.to)
      ? this.extractEmail(options.to[0])
      : this.extractEmail(options.to);

    this.logSendAttempt(recipient, options.subject);

    try {
      const msg: sgMail.MailDataRequired = {
        to: options.to as any,
        from: options.from || this.configService.get('EMAIL_FROM', 'noreply@deepref.ai'),
        replyTo: options.replyTo as any,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc as any,
        bcc: options.bcc as any,
        attachments: options.attachments?.map(att => ({
          content: att.content.toString('base64'),
          filename: att.filename,
          type: att.contentType,
        })),
        customArgs: options.metadata,
        categories: options.tags,
      };

      const [response] = await sgMail.send(msg);
      const messageId = response.headers['x-message-id'] || response.headers['message-id'] || `sg-${Date.now()}`;

      this.logSendSuccess(recipient, messageId);
      return this.createSuccessResult(messageId);
    } catch (error: any) {
      this.logSendError(recipient, error);

      // Handle SendGrid specific errors
      if (error.response) {
        const { body } = error.response;
        return this.createErrorResult(
          body?.errors?.[0]?.message || error.message,
        );
      }

      return this.createErrorResult(error);
    }
  }

  /**
   * Verify SendGrid connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // SendGrid doesn't have a ping endpoint, so we check if API key is valid format
      return this.apiKey.startsWith('SG.') && this.apiKey.length > 32;
    } catch (error) {
      this.logger.error('SendGrid connection verification failed:', error);
      return false;
    }
  }
}
