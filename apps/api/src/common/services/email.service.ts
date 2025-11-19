import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.emailEnabled = this.configService.get('EMAIL_SERVICE', 'stub') !== 'stub';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailEnabled) {
      this.logger.log(`📧 [STUB] Email would be sent to: ${options.to}`);
      this.logger.log(`📧 [STUB] Subject: ${options.subject}`);
      this.logger.log(`📧 [STUB] Content: ${options.text || options.html.substring(0, 100)}...`);
      return true;
    }

    // TODO: Implement actual email sending (SendGrid, AWS SES, etc.)
    this.logger.warn('Email service not configured. Email not sent.');
    return false;
  }

  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    const subject = 'Verify Your Email - DeepRef';
    const html = this.generateVerificationEmailTemplate(code);
    const text = `Your verification code is: ${code}. This code will expire in 24 hours.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendMagicLinkEmail(email: string, magicLink: string): Promise<boolean> {
    const subject = 'Your Magic Link - DeepRef';
    const html = this.generateMagicLinkTemplate(magicLink);
    const text = `Click this link to sign in: ${magicLink}. This link will expire in 15 minutes.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const subject = 'Reset Your Password - DeepRef';
    const html = this.generatePasswordResetTemplate(resetLink);
    const text = `Click this link to reset your password: ${resetLink}. This link will expire in 1 hour.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendKycStatusEmail(
    email: string,
    status: 'verified' | 'failed',
    reason?: string,
  ): Promise<boolean> {
    const subject =
      status === 'verified'
        ? 'KYC Verification Complete - DeepRef'
        : 'KYC Verification Failed - DeepRef';
    const html = this.generateKycStatusTemplate(status, reason);
    const text =
      status === 'verified'
        ? 'Your KYC verification has been completed successfully!'
        : `Your KYC verification failed. ${reason || 'Please try again.'}`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private generateVerificationEmailTemplate(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .code-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Welcome to DeepRef!</p>
              <p>Please use the following code to verify your email address:</p>
              <div class="code-box">${code}</div>
              <p>This code will expire in 24 hours.</p>
              <p>If you didn't create an account with DeepRef, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateMagicLinkTemplate(magicLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Magic Link</h1>
            </div>
            <div class="content">
              <p>Click the button below to sign in to your DeepRef account:</p>
              <div style="text-align: center;">
                <a href="${magicLink}" class="button">Sign In to DeepRef</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${magicLink}</p>
              <p><strong>This link will expire in 15 minutes.</strong></p>
              <p>If you didn't request this link, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetTemplate(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>We received a request to reset your password.</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateKycStatusTemplate(status: 'verified' | 'failed', reason?: string): string {
    const isVerified = status === 'verified';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isVerified ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'}; color: white; padding: 30px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .status-icon { font-size: 64px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>KYC Verification ${isVerified ? 'Complete' : 'Failed'}</h1>
            </div>
            <div class="content">
              <div class="status-icon">${isVerified ? '✅' : '❌'}</div>
              ${
                isVerified
                  ? `
                <p>Congratulations! Your identity verification has been completed successfully.</p>
                <p>You can now access all features of your DeepRef account.</p>
              `
                  : `
                <p>Unfortunately, we were unable to verify your identity.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>Please try submitting your documents again or contact support for assistance.</p>
              `
              }
            </div>
            <div class="footer">
              <p>&copy; 2025 DeepRef. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
