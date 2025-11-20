/**
 * Base Email Provider
 *
 * Abstract base class for all email providers
 */

import { Logger } from '@nestjs/common';
import {
  EmailOptions,
  EmailSendResult,
  IEmailProvider,
  EmailProvider,
} from '../interfaces/email.interfaces';

export abstract class BaseEmailProvider implements IEmailProvider {
  protected abstract readonly logger: Logger;
  protected abstract readonly provider: EmailProvider;

  /**
   * Send an email
   */
  abstract send(options: EmailOptions): Promise<EmailSendResult>;

  /**
   * Verify provider connection/configuration
   */
  abstract verifyConnection(): Promise<boolean>;

  /**
   * Normalize email address to string
   */
  protected normalizeEmailAddress(address: string | { email: string; name?: string }): string {
    if (typeof address === 'string') {
      return address;
    }
    return address.name ? `${address.name} <${address.email}>` : address.email;
  }

  /**
   * Extract email from address
   */
  protected extractEmail(address: string | { email: string; name?: string }): string {
    if (typeof address === 'string') {
      const match = address.match(/<(.+)>/);
      return match ? match[1] : address;
    }
    return address.email;
  }

  /**
   * Validate email address
   */
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create success result
   */
  protected createSuccessResult(messageId: string): EmailSendResult {
    return {
      success: true,
      messageId,
      provider: this.provider,
      timestamp: new Date(),
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(error: string | Error): EmailSendResult {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return {
      success: false,
      error: errorMessage,
      provider: this.provider,
      timestamp: new Date(),
    };
  }

  /**
   * Log send attempt
   */
  protected logSendAttempt(to: string, subject: string): void {
    this.logger.log(`Sending email via ${this.provider} to: ${to} | Subject: ${subject}`);
  }

  /**
   * Log send success
   */
  protected logSendSuccess(to: string, messageId: string): void {
    this.logger.log(`Email sent successfully via ${this.provider} to: ${to} | MessageId: ${messageId}`);
  }

  /**
   * Log send error
   */
  protected logSendError(to: string, error: string | Error): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    this.logger.error(`Failed to send email via ${this.provider} to: ${to} | Error: ${errorMessage}`);
  }
}
