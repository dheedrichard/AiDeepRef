import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class EmailMfaService {
  private readonly logger = new Logger(EmailMfaService.name);

  constructor(private emailService: EmailService) {}

  /**
   * Send MFA code via email
   */
  async sendMfaCode(email: string, code: string): Promise<boolean> {
    try {
      await this.emailService.sendEmail({
        to: email,
        subject: 'DeepRef - Two-Factor Authentication Code',
        html: this.generateMfaCodeEmail(code),
      });

      this.logger.log(`MFA code sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send MFA code to ${email}`, error);
      return false;
    }
  }

  /**
   * Generate HTML for MFA code email
   */
  private generateMfaCodeEmail(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4F46E5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .code-box {
              background-color: white;
              border: 2px solid #4F46E5;
              border-radius: 5px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #4F46E5;
            }
            .warning {
              background-color: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #6B7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Two-Factor Authentication</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You are receiving this email because a login attempt was made to your DeepRef account.</p>
              <p>Your two-factor authentication code is:</p>

              <div class="code-box">
                <div class="code">${code}</div>
              </div>

              <p>This code will expire in <strong>10 minutes</strong>.</p>

              <div class="warning">
                <strong>Security Notice:</strong>
                <p>If you did not attempt to log in, please secure your account immediately by changing your password and contacting our support team.</p>
              </div>

              <p>Never share this code with anyone. DeepRef staff will never ask for your authentication codes.</p>

              <div class="footer">
                <p>This is an automated message from DeepRef. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} DeepRef. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send trusted device notification
   */
  async sendTrustedDeviceNotification(
    email: string,
    deviceName: string,
    ipAddress: string,
  ): Promise<boolean> {
    try {
      await this.emailService.sendEmail({
        to: email,
        subject: 'DeepRef - New Trusted Device Added',
        html: this.generateTrustedDeviceEmail(deviceName, ipAddress),
      });

      this.logger.log(`Trusted device notification sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send trusted device notification to ${email}`, error);
      return false;
    }
  }

  /**
   * Generate HTML for trusted device notification
   */
  private generateTrustedDeviceEmail(deviceName: string, ipAddress: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">New Trusted Device Added</h2>
            <p>A new device has been added to your trusted devices list:</p>
            <ul>
              <li><strong>Device:</strong> ${deviceName}</li>
              <li><strong>IP Address:</strong> ${ipAddress}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>This device will be trusted for 30 days and won't require two-factor authentication during this period.</p>
            <p>If you don't recognize this device, please log in to your account and revoke its access immediately.</p>
            <p style="font-size: 12px; color: #6B7280; margin-top: 30px;">
              &copy; ${new Date().getFullYear()} DeepRef. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}
