/**
 * Email Template Service
 *
 * Renders email templates using Handlebars
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { convert } from 'html-to-text';
import { EmailTemplate, EmailTemplateContext, EmailType } from '../interfaces/email.interfaces';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private readonly templateDir: string;
  private readonly baseContext: EmailTemplateContext;

  constructor(private configService: ConfigService) {
    this.templateDir = this.configService.get<string>(
      'EMAIL_TEMPLATE_DIR',
      path.join(__dirname, '../templates'),
    );

    // Base context available to all templates
    this.baseContext = {
      companyName: this.configService.get<string>('EMAIL_COMPANY_NAME', 'DeepRef'),
      supportEmail: this.configService.get<string>('EMAIL_REPLY_TO', 'support@deepref.ai'),
      supportUrl: this.configService.get<string>('EMAIL_SUPPORT_URL', 'https://deepref.ai/support'),
      baseUrl: this.configService.get<string>('EMAIL_BASE_URL', 'https://deepref.ai'),
      logoUrl: this.configService.get<string>('EMAIL_LOGO_URL', 'https://deepref.ai/logo.png'),
      privacyUrl: this.configService.get<string>('EMAIL_PRIVACY_URL', 'https://deepref.ai/privacy'),
      termsUrl: this.configService.get<string>('EMAIL_TERMS_URL', 'https://deepref.ai/terms'),
      year: new Date().getFullYear(),
    };

    this.registerHelpers();
  }

  /**
   * Render email template
   */
  async render(templateType: EmailType, context: EmailTemplateContext): Promise<EmailTemplate> {
    const template = await this.getTemplate(templateType);
    const fullContext = { ...this.baseContext, ...context };

    const html = template(fullContext);
    const text = convert(html, {
      wordwrap: 80,
      selectors: [
        { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        { selector: 'img', format: 'skip' },
      ],
    });

    const subject = this.getSubject(templateType, fullContext);

    return { subject, html, text };
  }

  /**
   * Get compiled template
   */
  private async getTemplate(templateType: EmailType): Promise<HandlebarsTemplateDelegate> {
    // Check cache
    if (this.templateCache.has(templateType)) {
      return this.templateCache.get(templateType)!;
    }

    // Load and compile template
    const templatePath = path.join(this.templateDir, `${templateType}.hbs`);

    try {
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);

      // Cache compiled template
      this.templateCache.set(templateType, template);

      return template;
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateType}`, error);

      // Fallback to inline template
      return this.getFallbackTemplate(templateType);
    }
  }

  /**
   * Get subject line for email type
   */
  private getSubject(templateType: EmailType, context: EmailTemplateContext): string {
    const subjects: Record<EmailType, string> = {
      [EmailType.VERIFICATION]: 'Verify Your Email - DeepRef',
      [EmailType.MAGIC_LINK]: 'Your Magic Link - DeepRef',
      [EmailType.PASSWORD_RESET]: 'Reset Your Password - DeepRef',
      [EmailType.MFA_CODE]: 'Two-Factor Authentication Code - DeepRef',
      [EmailType.SECURITY_ALERT]: 'Security Alert - DeepRef',
      [EmailType.WELCOME]: 'Welcome to DeepRef!',
      [EmailType.REFERENCE_REQUEST]: 'Reference Request from DeepRef',
      [EmailType.REFERENCE_SUBMITTED]: 'Reference Submitted - DeepRef',
      [EmailType.REFERENCE_REMINDER]: 'Reference Request Reminder - DeepRef',
      [EmailType.KYC_STATUS]: `KYC Verification ${context.kycStatus === 'verified' ? 'Complete' : 'Failed'} - DeepRef`,
      [EmailType.ACCOUNT_LOCKOUT]: 'Account Locked - DeepRef',
      [EmailType.SUSPICIOUS_LOGIN]: 'Suspicious Login Attempt - DeepRef',
      [EmailType.SYSTEM_NOTIFICATION]: 'System Notification - DeepRef',
      [EmailType.MARKETING]: context.marketingSubject || 'Update from DeepRef',
    };

    return subjects[templateType] || 'Notification from DeepRef';
  }

  /**
   * Get fallback template for missing template files
   */
  private getFallbackTemplate(templateType: EmailType): HandlebarsTemplateDelegate {
    const source = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
    .content { padding: 40px 30px; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{companyName}}</h1>
    </div>
    <div class="content">
      {{{content}}}
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      <p>
        <a href="{{privacyUrl}}">Privacy Policy</a> |
        <a href="{{termsUrl}}">Terms of Service</a> |
        <a href="{{supportUrl}}">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return Handlebars.compile(source);
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Format time helper
    Handlebars.registerHelper('formatTime', (date: Date) => {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // If equal helper
    Handlebars.registerHelper('ifeq', function(a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }
}
