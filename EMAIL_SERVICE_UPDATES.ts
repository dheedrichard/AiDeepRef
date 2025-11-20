/**
 * EMAIL SERVICE UPDATES
 * Add these methods to /home/user/AiDeepRef/apps/api/src/common/services/email.service.ts
 */

// ==========================================
// NEW METHOD TO ADD TO EmailService class
// ==========================================

/**
 * Send security alert email
 */
async sendSecurityAlert(
  email: string,
  subject: string,
  message: string,
): Promise<boolean> {
  const fullSubject = `Security Alert: ${subject} - DeepRef`;
  const html = this.generateSecurityAlertTemplate(subject, message);
  const text = `Security Alert: ${subject}\n\n${message}\n\nIf this wasn't you, please contact support immediately.`;

  return this.sendEmail({
    to: email,
    subject: fullSubject,
    html,
    text,
  });
}

/**
 * Send password changed confirmation email
 */
async sendPasswordChangedEmail(email: string): Promise<boolean> {
  const subject = 'Password Changed Successfully - DeepRef';
  const html = this.generatePasswordChangedTemplate();
  const text = 'Your password was changed successfully. If this wasn\'t you, please contact support immediately.';

  return this.sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send account locked email
 */
async sendAccountLockedEmail(email: string, remainingMinutes: number): Promise<boolean> {
  const subject = 'Account Locked - DeepRef';
  const html = this.generateAccountLockedTemplate(remainingMinutes);
  const text = `Your account has been locked due to multiple failed login attempts. It will be unlocked in ${remainingMinutes} minutes.`;

  return this.sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send new device login notification
 */
async sendNewDeviceLoginEmail(
  email: string,
  deviceName: string,
  ipAddress: string,
  timestamp: Date,
): Promise<boolean> {
  const subject = 'New Device Login - DeepRef';
  const html = this.generateNewDeviceLoginTemplate(deviceName, ipAddress, timestamp);
  const text = `A new device logged into your account: ${deviceName} from IP ${ipAddress} at ${timestamp.toLocaleString()}`;

  return this.sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

// ==========================================
// PRIVATE TEMPLATE METHODS
// ==========================================

private generateSecurityAlertTemplate(subject: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .alert-box { background: #fff3cd; border-left: 4px solid #ff6a00; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Security Alert</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <div class="alert-box">
              <p>${message}</p>
            </div>
            <p><strong>What should you do?</strong></p>
            <ul>
              <li>If this was you, no action is needed</li>
              <li>If this wasn't you, change your password immediately</li>
              <li>Contact our support team if you need assistance</li>
            </ul>
            <div style="text-align: center;">
              <a href="${this.configService.get('APP_URL', 'http://localhost:3000')}/settings/security" class="button">
                Review Security Settings
              </a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Time: ${new Date().toLocaleString()}<br>
              This is an automated security notification from DeepRef.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2025 DeepRef. All rights reserved.</p>
            <p>Need help? Contact support@deepref.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

private generatePasswordChangedTemplate(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <p>Your password has been changed successfully.</p>
            <p><strong>Security measures taken:</strong></p>
            <ul>
              <li>All other devices have been logged out</li>
              <li>Any active sessions have been terminated</li>
              <li>You'll need to login again on other devices</li>
            </ul>
            <p style="margin-top: 20px;">
              <strong>Didn't make this change?</strong><br>
              If you didn't change your password, your account may be compromised.
              Please contact support immediately.
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Changed at: ${new Date().toLocaleString()}
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2025 DeepRef. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

private generateAccountLockedTemplate(remainingMinutes: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .warning-box { background: #fff3cd; border: 2px solid #ff6a00; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Account Locked</h1>
          </div>
          <div class="content">
            <div class="warning-box">
              <h2>Your account has been temporarily locked</h2>
              <p>We detected multiple failed login attempts on your account.</p>
              <p><strong>Account will be unlocked in: ${remainingMinutes} minutes</strong></p>
            </div>
            <p><strong>Why was my account locked?</strong></p>
            <p>This is a security measure to protect your account from unauthorized access attempts.</p>
            <p><strong>What should I do?</strong></p>
            <ul>
              <li>Wait ${remainingMinutes} minutes for automatic unlock</li>
              <li>If you forgot your password, use the "Forgot Password" option</li>
              <li>If you didn't try to login, someone may be attempting to access your account</li>
              <li>Consider changing your password once unlocked</li>
            </ul>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Locked at: ${new Date().toLocaleString()}
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2025 DeepRef. All rights reserved.</p>
            <p>Need immediate help? Contact support@deepref.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

private generateNewDeviceLoginTemplate(
  deviceName: string,
  ipAddress: string,
  timestamp: Date,
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .info-box { background: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 New Device Login</h1>
          </div>
          <div class="content">
            <p>A new device was used to access your DeepRef account.</p>
            <div class="info-box">
              <p><strong>Device:</strong> ${deviceName}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
            </div>
            <p><strong>Was this you?</strong></p>
            <ul>
              <li>If yes, you can ignore this email</li>
              <li>If no, secure your account immediately by changing your password</li>
            </ul>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This is an automated security notification.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2025 DeepRef. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ==========================================
// UPDATE EXISTING handleFailedLogin in auth.service.ts
// ==========================================

/**
 * In auth.service.ts, update the handleFailedLogin method to use the new email method:
 */

// OLD CODE:
// await this.emailService.sendSecurityAlert(user.email, 'Account locked due to multiple failed login attempts');

// NEW CODE:
// const remainingTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
// await this.emailService.sendAccountLockedEmail(user.email, remainingTime);
