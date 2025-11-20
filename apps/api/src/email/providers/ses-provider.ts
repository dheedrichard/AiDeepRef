/**
 * AWS SES Email Provider
 *
 * Implements email sending using AWS Simple Email Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { BaseEmailProvider } from './base-email-provider';
import {
  EmailOptions,
  EmailSendResult,
  EmailProvider,
} from '../interfaces/email.interfaces';

@Injectable()
export class SESProvider extends BaseEmailProvider {
  protected readonly logger = new Logger(SESProvider.name);
  protected readonly provider = EmailProvider.SES;
  private readonly sesClient: SESClient;
  private readonly isConfigured: boolean;
  private readonly configurationSetName?: string;

  constructor(private configService: ConfigService) {
    super();

    const region = this.configService.get<string>('AWS_SES_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('AWS_SES_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('AWS_SES_SECRET_ACCESS_KEY', '');

    this.isConfigured = !!(accessKeyId && secretAccessKey);
    this.configurationSetName = this.configService.get<string>('AWS_SES_CONFIGURATION_SET');

    if (this.isConfigured) {
      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('AWS SES provider initialized');
    } else {
      this.logger.warn('AWS SES credentials not configured');
    }
  }

  /**
   * Send email via AWS SES
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.isConfigured) {
      return this.createErrorResult('AWS SES not configured');
    }

    const recipient = Array.isArray(options.to)
      ? this.extractEmail(options.to[0])
      : this.extractEmail(options.to);

    this.logSendAttempt(recipient, options.subject);

    try {
      // If there are attachments, use SendRawEmailCommand
      if (options.attachments && options.attachments.length > 0) {
        return await this.sendRawEmail(options);
      }

      // Otherwise use simple SendEmailCommand
      const toAddresses = this.normalizeToArray(options.to).map(addr => this.extractEmail(addr));
      const ccAddresses = options.cc ? this.normalizeToArray(options.cc).map(addr => this.extractEmail(addr)) : undefined;
      const bccAddresses = options.bcc ? this.normalizeToArray(options.bcc).map(addr => this.extractEmail(addr)) : undefined;

      const command = new SendEmailCommand({
        Source: this.normalizeEmailAddress(
          options.from || this.configService.get('EMAIL_FROM', 'noreply@deepref.ai'),
        ),
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: ccAddresses,
          BccAddresses: bccAddresses,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: 'UTF-8',
            },
            Text: options.text ? {
              Data: options.text,
              Charset: 'UTF-8',
            } : undefined,
          },
        },
        ReplyToAddresses: options.replyTo ? [this.normalizeEmailAddress(options.replyTo)] : undefined,
        ConfigurationSetName: this.configurationSetName,
        Tags: options.tags?.map(tag => ({
          Name: 'category',
          Value: tag,
        })),
      });

      const response = await this.sesClient.send(command);
      const messageId = response.MessageId || `ses-${Date.now()}`;

      this.logSendSuccess(recipient, messageId);
      return this.createSuccessResult(messageId);
    } catch (error: any) {
      this.logSendError(recipient, error);
      return this.createErrorResult(error);
    }
  }

  /**
   * Send raw email with attachments
   */
  private async sendRawEmail(options: EmailOptions): Promise<EmailSendResult> {
    const rawMessage = this.buildRawMessage(options);

    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
      ConfigurationSetName: this.configurationSetName,
    });

    const response = await this.sesClient.send(command);
    const messageId = response.MessageId || `ses-${Date.now()}`;

    const recipient = Array.isArray(options.to)
      ? this.extractEmail(options.to[0])
      : this.extractEmail(options.to);

    this.logSendSuccess(recipient, messageId);
    return this.createSuccessResult(messageId);
  }

  /**
   * Build raw MIME message
   */
  private buildRawMessage(options: EmailOptions): string {
    const boundary = `----=_Part_${Date.now()}`;
    const from = this.normalizeEmailAddress(
      options.from || this.configService.get('EMAIL_FROM', 'noreply@deepref.ai'),
    );
    const to = this.normalizeToArray(options.to).map(addr => this.normalizeEmailAddress(addr)).join(', ');

    let message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${options.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${boundary}_alt"`,
      '',
    ];

    // Add text part
    if (options.text) {
      message.push(
        `--${boundary}_alt`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        options.text,
        '',
      );
    }

    // Add HTML part
    message.push(
      `--${boundary}_alt`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      options.html,
      '',
      `--${boundary}_alt--`,
    );

    // Add attachments
    if (options.attachments) {
      for (const attachment of options.attachments) {
        const content = Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64');

        message.push(
          '',
          `--${boundary}`,
          `Content-Type: ${attachment.contentType || 'application/octet-stream'}`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          content,
        );
      }
    }

    message.push(`--${boundary}--`);
    return message.join('\r\n');
  }

  /**
   * Normalize to array
   */
  private normalizeToArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Verify SES connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // Try to get send quota to verify connection
      const { SESClient, GetSendQuotaCommand } = await import('@aws-sdk/client-ses');
      const command = new GetSendQuotaCommand({});
      await this.sesClient.send(command);
      return true;
    } catch (error) {
      this.logger.error('AWS SES connection verification failed:', error);
      return false;
    }
  }
}
