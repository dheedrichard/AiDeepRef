/**
 * SMTP Email Provider
 *
 * Implements email sending using standard SMTP protocol
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { BaseEmailProvider } from './base-email-provider';
import {
  EmailOptions,
  EmailSendResult,
  EmailProvider,
} from '../interfaces/email.interfaces';

@Injectable()
export class SMTPProvider extends BaseEmailProvider {
  protected readonly logger = new Logger(SMTPProvider.name);
  protected readonly provider = EmailProvider.SMTP;
  private readonly transporter: Transporter;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    super();

    const host = this.configService.get<string>('SMTP_HOST', '');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER', '');
    const password = this.configService.get<string>('SMTP_PASSWORD', '');

    this.isConfigured = !!(host && user && password);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass: password,
        },
        // Connection pool settings
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // Timeouts
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      this.logger.log('SMTP provider initialized');
    } else {
      this.logger.warn('SMTP credentials not configured');
    }
  }

  /**
   * Send email via SMTP
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.isConfigured) {
      return this.createErrorResult('SMTP not configured');
    }

    const recipient = Array.isArray(options.to)
      ? this.extractEmail(options.to[0])
      : this.extractEmail(options.to);

    this.logSendAttempt(recipient, options.subject);

    try {
      const mailOptions = {
        from: options.from || this.configService.get('EMAIL_FROM', 'noreply@deepref.ai'),
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding as any,
        })),
        headers: options.headers,
      };

      const info = await this.transporter.sendMail(mailOptions);
      const messageId = info.messageId || `smtp-${Date.now()}`;

      this.logSendSuccess(recipient, messageId);
      return this.createSuccessResult(messageId);
    } catch (error: any) {
      this.logSendError(recipient, error);
      return this.createErrorResult(error);
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }

  /**
   * Close SMTP connection pool
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.logger.log('SMTP connection pool closed');
    }
  }
}
