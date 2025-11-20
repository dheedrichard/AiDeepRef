/**
 * Email Processor
 *
 * Processes email sending jobs from the Bull queue
 */

import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { EmailJobData, EmailProvider, IEmailProvider } from '../interfaces/email.interfaces';
import { EmailTrackingService } from '../services/email-tracking.service';
import { SendGridProvider } from '../providers/sendgrid-provider';
import { SESProvider } from '../providers/ses-provider';
import { SMTPProvider } from '../providers/smtp-provider';
import { StubProvider } from '../providers/stub-provider';

@Processor('email-sending')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly provider: IEmailProvider;
  private readonly trackingEnabled: boolean;
  private readonly testRecipient?: string;

  constructor(
    private configService: ConfigService,
    private trackingService: EmailTrackingService,
    private sendGridProvider: SendGridProvider,
    private sesProvider: SESProvider,
    private smtpProvider: SMTPProvider,
    private stubProvider: StubProvider,
  ) {
    this.trackingEnabled = this.configService.get<string>('EMAIL_ENABLE_TRACKING', 'true') === 'true';
    this.testRecipient = this.configService.get<string>('EMAIL_TEST_RECIPIENT');

    // Select provider
    const providerType = this.configService.get<EmailProvider>('EMAIL_SERVICE', EmailProvider.STUB);
    this.provider = this.getProvider(providerType);
  }

  /**
   * Process email sending job
   */
  @Process('send-email')
  async handleEmailSend(job: Job<EmailJobData>): Promise<{ success: boolean; messageId?: string }> {
    const { options, type: emailType, userId } = job.data;

    this.logger.log(`Processing email job ${job.id}: ${emailType} to ${this.extractEmail(options.to)}`);

    try {
      // Override recipient in test mode
      if (this.testRecipient) {
        options.to = this.testRecipient;
      }

      // Log email send attempt
      let emailLogId: string | undefined;
      if (this.trackingEnabled) {
        const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
        const recipientEmail = typeof recipient === 'string' ? recipient : recipient.email;
        const recipientName = typeof recipient === 'string' ? undefined : recipient.name;

        const log = await this.trackingService.logEmailSend({
          userId,
          recipientEmail,
          recipientName,
          emailType,
          subject: options.subject,
          provider: this.provider['provider'], // Access provider type
          metadata: options.metadata,
          tags: options.tags,
        });

        emailLogId = log.id;
      }

      // Send email
      const result = await this.provider.send(options);

      // Update tracking
      if (this.trackingEnabled && result.messageId) {
        await this.trackingService.updateEmailStatus(result.messageId, 'sent');
      }

      if (!result.success) {
        this.logger.error(`Email send failed: ${result.error}`);

        // Update tracking with error
        if (this.trackingEnabled && result.messageId) {
          await this.trackingService.updateEmailStatus(
            result.messageId,
            'failed',
            result.error,
          );
        }

        throw new Error(result.error || 'Email send failed');
      }

      this.logger.log(`Email sent successfully: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to process email job ${job.id}:`, error.message);

      // Track retry if enabled
      if (this.trackingEnabled && job.attemptsMade < (job.opts.attempts || 1)) {
        // Will be retried
        this.logger.log(`Email job ${job.id} will be retried (attempt ${job.attemptsMade + 1})`);
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Hook: Job becomes active
   */
  @OnQueueActive()
  onActive(job: Job<EmailJobData>) {
    const { type, options } = job.data;
    this.logger.debug(
      `Processing email job ${job.id}: ${type} to ${this.extractEmail(options.to)}`,
    );
  }

  /**
   * Hook: Job completed
   */
  @OnQueueCompleted()
  onCompleted(job: Job<EmailJobData>, result: any) {
    const { type } = job.data;
    this.logger.log(
      `Email job ${job.id} completed: ${type} | MessageId: ${result.messageId || 'N/A'}`,
    );
  }

  /**
   * Hook: Job failed
   */
  @OnQueueFailed()
  async onFailed(job: Job<EmailJobData>, error: Error) {
    const { type, userId } = job.data;

    this.logger.error(
      `Email job ${job.id} failed after ${job.attemptsMade} attempts: ${type}`,
      error.message,
    );

    // If all retries exhausted, log final failure
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      this.logger.error(
        `Email job ${job.id} permanently failed: ${type}. No more retries.`,
      );

      // Could send alert to admin here
      if (userId) {
        this.logger.warn(`User ${userId} failed to receive email type: ${type}`);
      }
    }
  }

  /**
   * Get provider instance
   */
  private getProvider(type: EmailProvider): IEmailProvider {
    switch (type) {
      case EmailProvider.SENDGRID:
        return this.sendGridProvider;
      case EmailProvider.SES:
        return this.sesProvider;
      case EmailProvider.SMTP:
        return this.smtpProvider;
      case EmailProvider.STUB:
      default:
        return this.stubProvider;
    }
  }

  /**
   * Extract email from address
   */
  private extractEmail(
    address: string | { email: string; name?: string } | Array<string | { email: string; name?: string }>,
  ): string {
    if (Array.isArray(address)) {
      return this.extractEmail(address[0]);
    }
    if (typeof address === 'string') {
      return address;
    }
    return address.email;
  }
}
