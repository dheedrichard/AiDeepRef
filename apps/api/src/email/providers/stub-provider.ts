/**
 * Stub Email Provider
 *
 * Development provider that logs emails instead of sending them
 * Optionally saves emails to disk for preview
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseEmailProvider } from './base-email-provider';
import {
  EmailOptions,
  EmailSendResult,
  EmailProvider,
} from '../interfaces/email.interfaces';

@Injectable()
export class StubProvider extends BaseEmailProvider {
  protected readonly logger = new Logger(StubProvider.name);
  protected readonly provider = EmailProvider.STUB;
  private readonly previewMode: boolean;
  private readonly captureDir: string;

  constructor(private configService: ConfigService) {
    super();
    this.previewMode = this.configService.get<string>('EMAIL_PREVIEW_MODE', 'false') === 'true';
    this.captureDir = this.configService.get<string>('EMAIL_CAPTURE_DIR', './email-previews');

    if (this.previewMode) {
      this.ensureCaptureDirectory();
    }

    this.logger.log('Stub email provider initialized (development mode)');
  }

  /**
   * "Send" email (log and optionally save to disk)
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    const recipient = Array.isArray(options.to)
      ? this.extractEmail(options.to[0])
      : this.extractEmail(options.to);

    // Log email details
    this.logger.log(`
=== Email [STUB] ===
To: ${recipient}
Subject: ${options.subject}
Text: ${options.text?.substring(0, 100)}${options.text && options.text.length > 100 ? '...' : ''}
===================
    `.trim());

    // Save to disk if preview mode is enabled
    if (this.previewMode) {
      try {
        await this.saveEmailPreview(options, recipient);
      } catch (error) {
        this.logger.error('Failed to save email preview:', error);
      }
    }

    const messageId = `stub-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return this.createSuccessResult(messageId);
  }

  /**
   * Verify connection (always true for stub)
   */
  async verifyConnection(): Promise<boolean> {
    return true;
  }

  /**
   * Save email preview to disk
   */
  private async saveEmailPreview(options: EmailOptions, recipient: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedSubject = options.subject.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const filename = `${timestamp}_${sanitizedSubject}.html`;
    const filepath = path.join(this.captureDir, filename);

    // Create preview HTML with metadata
    const preview = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .email-meta {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
      padding: 20px;
      margin-bottom: 20px;
    }
    .email-meta h2 { margin: 0 0 10px 0; }
    .email-meta table { width: 100%; border-collapse: collapse; }
    .email-meta td { padding: 5px; border-bottom: 1px solid #ddd; }
    .email-meta td:first-child { font-weight: bold; width: 100px; }
    .email-content { padding: 20px; }
  </style>
</head>
<body>
  <div class="email-meta">
    <h2>Email Preview (Development Mode)</h2>
    <table>
      <tr><td>To:</td><td>${recipient}</td></tr>
      <tr><td>From:</td><td>${this.normalizeEmailAddress(options.from || 'noreply@deepref.ai')}</td></tr>
      ${options.replyTo ? `<tr><td>Reply-To:</td><td>${this.normalizeEmailAddress(options.replyTo)}</td></tr>` : ''}
      <tr><td>Subject:</td><td>${options.subject}</td></tr>
      <tr><td>Date:</td><td>${new Date().toISOString()}</td></tr>
      ${options.tags ? `<tr><td>Tags:</td><td>${options.tags.join(', ')}</td></tr>` : ''}
    </table>
  </div>
  <div class="email-content">
    ${options.html}
  </div>
</body>
</html>
    `.trim();

    await fs.writeFile(filepath, preview, 'utf-8');
    this.logger.log(`Email preview saved: ${filepath}`);
  }

  /**
   * Ensure capture directory exists
   */
  private async ensureCaptureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.captureDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create email capture directory: ${this.captureDir}`, error);
    }
  }
}
