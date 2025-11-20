/**
 * Email Service (New Implementation)
 *
 * Comprehensive email service with multi-provider support, queue processing,
 * rate limiting, tracking, and template rendering.
 *
 * This replaces /home/user/AiDeepRef/apps/api/src/common/services/email.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  EmailOptions,
  EmailProvider,
  EmailType,
  EmailPriority,
  EmailJobData,
  EmailTemplateContext,
  IEmailProvider,
} from '../interfaces/email.interfaces';
import { EmailTemplateService } from './email-template.service';
import { EmailRateLimiterService } from './email-rate-limiter.service';
import { EmailTrackingService } from './email-tracking.service';
import { SendGridProvider } from '../providers/sendgrid-provider';
import { SESProvider } from '../providers/ses-provider';
import { SMTPProvider } from '../providers/smtp-provider';
import { StubProvider } from '../providers/stub-provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: IEmailProvider;
  private readonly queueEnabled: boolean;
  private readonly trackingEnabled: boolean;
  private readonly testRecipient?: string;

  constructor(
    @InjectQueue('email-sending') private readonly emailQueue: Queue,
    private configService: ConfigService,
    private templateService: EmailTemplateService,
    private rateLimiterService: EmailRateLimiterService,
    private trackingService: EmailTrackingService,
    private sendGridProvider: SendGridProvider,
    private sesProvider: SESProvider,
    private smtpProvider: SMTPProvider,
    private stubProvider: StubProvider,
  ) {
    this.queueEnabled = this.configService.get<string>('EMAIL_ENABLE_QUEUE', 'true') === 'true';
    this.trackingEnabled = this.configService.get<string>('EMAIL_ENABLE_TRACKING', 'true') === 'true';
    this.testRecipient = this.configService.get<string>('EMAIL_TEST_RECIPIENT');

    // Select provider based on configuration
    const providerType = this.configService.get<EmailProvider>('EMAIL_SERVICE', EmailProvider.STUB);
    this.provider = this.getProvider(providerType);

    this.logger.log(`Email service initialized with provider: ${providerType}`);
    if (this.queueEnabled) {
      this.logger.log('Email queue processing enabled');
    }
    if (this.trackingEnabled) {
      this.logger.log('Email tracking enabled');
    }
  }

  /**
   * Send email with template
   */
  async sendTemplatedEmail(
    emailType: EmailType,
    recipient: string,
    context: EmailTemplateContext,
    options?: {
      userId?: string;
      priority?: EmailPriority;
      tags?: string[];
      metadata?: Record<string, any>;
    },
  ): Promise<boolean> {
    try {
      // Render template
      const template = await this.templateService.render(emailType, context);

      // Prepare email options
      const emailOptions: EmailOptions = {
        to: this.getRecipient(recipient, context.recipientName),
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: options?.tags,
        metadata: options?.metadata,
      };

      // Check rate limits
      if (options?.userId) {
        const rateLimitCheck = await this.rateLimiterService.checkUserLimit(
          options.userId,
          emailType,
        );

        if (!rateLimitCheck.allowed) {
          this.logger.warn(
            `Rate limit exceeded for user ${options.userId}, email type: ${emailType}`,
          );
          return false;
        }
      }

      // Check recipient limit (prevent spam to same address)
      const recipientAllowed = await this.rateLimiterService.checkRecipientLimit(
        recipient,
        emailType,
        emailType === EmailType.MFA_CODE ? 1 : 5, // Stricter limit for MFA
      );

      if (!recipientAllowed) {
        this.logger.warn(
          `Recipient ${recipient} has received this email type recently. Skipping send.`,
        );
        return false;
      }

      // Queue or send directly
      if (this.queueEnabled) {
        await this.queueEmail(emailOptions, emailType, options?.userId, options?.priority);
        return true;
      } else {
        const result = await this.sendDirect(emailOptions, emailType, options?.userId);
        return result.success;
      }
    } catch (error) {
      this.logger.error(`Failed to send templated email: ${emailType}`, error);
      return false;
    }
  }

  /**
   * Send email directly (synchronous)
   */
  async sendDirect(
    options: EmailOptions,
    emailType: EmailType,
    userId?: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Override recipient in test mode
      if (this.testRecipient) {
        options = { ...options, to: this.testRecipient };
      }

      // Send via provider
      const result = await this.provider.send(options);

      // Track if enabled
      if (this.trackingEnabled && result.success) {
        const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
        const recipientEmail = typeof recipient === 'string' ? recipient : recipient.email;
        const recipientName = typeof recipient === 'string' ? undefined : recipient.name;

        await this.trackingService.logEmailSend({
          userId,
          recipientEmail,
          recipientName,
          emailType,
          subject: options.subject,
          provider: result.provider,
          messageId: result.messageId,
          metadata: options.metadata,
          tags: options.tags,
        });

        if (result.messageId) {
          await this.trackingService.updateEmailStatus(result.messageId, 'sent');
        }
      }

      return {
        success: result.success,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error('Failed to send email directly', error);
      return { success: false };
    }
  }

  /**
   * Queue email for asynchronous sending
   */
  private async queueEmail(
    options: EmailOptions,
    emailType: EmailType,
    userId?: string,
    priority: EmailPriority = EmailPriority.NORMAL,
  ): Promise<void> {
    const jobData: EmailJobData = {
      options,
      type: emailType,
      userId,
      priority,
    };

    await this.emailQueue.add(
      'send-email',
      jobData,
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Email queued: ${emailType} to ${this.extractEmail(options.to)}`);
  }

  /**
   * ========================================
   * Convenience Methods (backward compatible)
   * ========================================
   */

  async sendVerificationEmail(email: string, code: string, userId?: string): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.VERIFICATION,
      email,
      { verificationCode: code },
      { userId, priority: EmailPriority.HIGH },
    );
  }

  async sendMagicLinkEmail(email: string, magicLink: string, userId?: string): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.MAGIC_LINK,
      email,
      { magicLink },
      { userId, priority: EmailPriority.HIGH },
    );
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userId?: string): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.PASSWORD_RESET,
      email,
      { resetLink },
      { userId, priority: EmailPriority.HIGH },
    );
  }

  async sendMfaCodeEmail(email: string, code: string, userId?: string): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.MFA_CODE,
      email,
      { mfaCode: code },
      { userId, priority: EmailPriority.CRITICAL },
    );
  }

  async sendSecurityAlert(
    email: string,
    alertMessage: string,
    userId?: string,
    alertType: 'lockout' | 'suspicious_login' | 'other' = 'other',
  ): Promise<boolean> {
    const type = alertType === 'lockout'
      ? EmailType.ACCOUNT_LOCKOUT
      : alertType === 'suspicious_login'
      ? EmailType.SUSPICIOUS_LOGIN
      : EmailType.SECURITY_ALERT;

    return this.sendTemplatedEmail(
      type,
      email,
      { alertMessage },
      { userId, priority: EmailPriority.HIGH },
    );
  }

  async sendWelcomeEmail(email: string, userName: string, userId?: string): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.WELCOME,
      email,
      { recipientName: userName },
      { userId, priority: EmailPriority.NORMAL },
    );
  }

  async sendReferenceRequestEmail(
    email: string,
    requesterName: string,
    referenceUrl: string,
    userId?: string,
  ): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.REFERENCE_REQUEST,
      email,
      { requesterName, referenceUrl },
      { userId, priority: EmailPriority.NORMAL },
    );
  }

  async sendKycStatusEmail(
    email: string,
    status: 'verified' | 'failed',
    reason?: string,
    userId?: string,
  ): Promise<boolean> {
    return this.sendTemplatedEmail(
      EmailType.KYC_STATUS,
      email,
      { kycStatus: status, kycReason: reason },
      { userId, priority: EmailPriority.HIGH },
    );
  }

  /**
   * ========================================
   * Helper Methods
   * ========================================
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

  private getRecipient(email: string, name?: string) {
    return name ? { email, name } : email;
  }

  private extractEmail(address: string | { email: string; name?: string } | Array<string | { email: string; name?: string }>): string {
    if (Array.isArray(address)) {
      return this.extractEmail(address[0]);
    }
    if (typeof address === 'string') {
      return address;
    }
    return address.email;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Verify provider connection
   */
  async verifyConnection(): Promise<boolean> {
    return await this.provider.verifyConnection();
  }
}
