# Email Service Module

Comprehensive email notification system with multi-provider support, queue processing, rate limiting, and delivery tracking.

## Features

- **Multi-Provider Support**: SendGrid, AWS SES, SMTP, and Stub (development)
- **Asynchronous Processing**: Bull queue with Redis for reliable email delivery
- **Template System**: Handlebars templates with responsive HTML emails
- **Rate Limiting**: Per-user and global rate limits to prevent abuse
- **Delivery Tracking**: Track sends, deliveries, opens, clicks, bounces, and complaints
- **Retry Logic**: Automatic retry with exponential backoff
- **Webhook Integration**: Handle delivery notifications from providers
- **Development Mode**: Preview emails without sending

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Usage](#usage)
4. [Email Templates](#email-templates)
5. [Rate Limiting](#rate-limiting)
6. [Tracking & Analytics](#tracking--analytics)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install --save @sendgrid/mail @aws-sdk/client-ses nodemailer handlebars html-to-text
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Configure Environment

Copy `.env.email.example` to `.env` and configure your email provider:

```bash
# For development
EMAIL_SERVICE=stub
EMAIL_PREVIEW_MODE=true

# For production with SendGrid
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
```

### 4. Import Module

```typescript
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // ... other imports
    EmailModule,
  ],
})
export class AppModule {}
```

### 5. Use Service

```typescript
import { EmailService } from './email/services/email.service';

@Injectable()
export class AuthService {
  constructor(private emailService: EmailService) {}

  async sendVerification(email: string, code: string, userId: string) {
    await this.emailService.sendVerificationEmail(email, code, userId);
  }
}
```

---

## Configuration

### Environment Variables

See `.env.email.example` for all configuration options.

#### Key Variables

```bash
# Provider selection
EMAIL_SERVICE=sendgrid|ses|smtp|stub

# Sender configuration
EMAIL_FROM=DeepRef <noreply@deepref.ai>
EMAIL_REPLY_TO=support@deepref.ai

# Features
EMAIL_ENABLE_QUEUE=true
EMAIL_ENABLE_TRACKING=true

# Rate limits
EMAIL_RATE_LIMIT_USER_HOURLY=10
EMAIL_RATE_LIMIT_GLOBAL_HOURLY=1000
```

### Provider Setup

#### SendGrid (Recommended for MVP)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Verify your domain
3. Create API key with "Mail Send" permission
4. Configure webhook for delivery tracking

```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_WEBHOOK_SECRET=your_webhook_secret
```

#### AWS SES (Recommended for Scale)

1. Request production access in AWS Console
2. Verify your domain
3. Create IAM user with SES permissions
4. Set up SNS for bounce notifications

```bash
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your_access_key_id
AWS_SES_SECRET_ACCESS_KEY=your_secret_access_key
AWS_SES_CONFIGURATION_SET=deepref-emails
```

#### SMTP (Development/Testing)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## Usage

### Send Templated Emails

```typescript
// Email verification
await emailService.sendVerificationEmail(
  'user@example.com',
  '123456',
  userId
);

// Magic link
await emailService.sendMagicLinkEmail(
  'user@example.com',
  'https://app.com/auth/verify/token',
  userId
);

// Password reset
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'https://app.com/reset/token',
  userId
);

// MFA code
await emailService.sendMfaCodeEmail(
  'user@example.com',
  '654321',
  userId
);

// Security alert
await emailService.sendSecurityAlert(
  'user@example.com',
  'Account locked due to multiple failed login attempts',
  userId,
  'lockout'
);

// Welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  userId
);

// Reference request
await emailService.sendReferenceRequestEmail(
  'referee@example.com',
  'Jane Smith',
  'https://app.com/references/submit/token',
  userId
);

// KYC status
await emailService.sendKycStatusEmail(
  'user@example.com',
  'verified', // or 'failed'
  undefined, // optional reason
  userId
);
```

### Send Custom Templated Email

```typescript
await emailService.sendTemplatedEmail(
  EmailType.SYSTEM_NOTIFICATION,
  'user@example.com',
  {
    recipientName: 'John Doe',
    notificationMessage: 'Your reference has been approved',
    actionUrl: 'https://app.com/references',
  },
  {
    userId: 'user-id',
    priority: EmailPriority.NORMAL,
    tags: ['system', 'notification'],
    metadata: { referenceId: 'ref-123' },
  }
);
```

### Send Direct (Synchronous)

For critical emails that must be sent immediately:

```typescript
const result = await emailService.sendDirect(
  {
    to: 'user@example.com',
    subject: 'Urgent: Action Required',
    html: '<p>Email content</p>',
    text: 'Email content',
  },
  EmailType.SECURITY_ALERT,
  userId
);

console.log(`Success: ${result.success}, MessageId: ${result.messageId}`);
```

---

## Email Templates

### Template Location

Templates are stored in `/src/email/templates/` as Handlebars (.hbs) files.

### Available Templates

- `verification.hbs` - Email verification code
- `magic_link.hbs` - Magic link authentication
- `password_reset.hbs` - Password reset link
- `mfa_code.hbs` - Two-factor authentication code
- `security_alert.hbs` - Security alerts
- `account_lockout.hbs` - Account lockout notification
- `suspicious_login.hbs` - Suspicious login attempt
- `welcome.hbs` - Welcome email
- `reference_request.hbs` - Reference request
- `kyc_status.hbs` - KYC verification status

### Template Context

All templates have access to base context:

```typescript
{
  companyName: 'DeepRef',
  supportEmail: 'support@deepref.ai',
  supportUrl: 'https://deepref.ai/support',
  baseUrl: 'https://deepref.ai',
  logoUrl: 'https://deepref.ai/logo.png',
  privacyUrl: 'https://deepref.ai/privacy',
  termsUrl: 'https://deepref.ai/terms',
  year: 2025,
}
```

Plus template-specific context (e.g., `verificationCode`, `magicLink`, etc.)

### Custom Templates

Create a new template file:

```handlebars
<!-- /src/email/templates/custom.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{subject}}</title>
</head>
<body>
  <h1>Hello, {{recipientName}}!</h1>
  <p>{{customMessage}}</p>
  <p>&copy; {{year}} {{companyName}}</p>
</body>
</html>
```

Use the template:

```typescript
await emailService.sendTemplatedEmail(
  'custom' as EmailType,
  'user@example.com',
  {
    recipientName: 'John',
    customMessage: 'Your custom message here',
  }
);
```

---

## Rate Limiting

### Configuration

```bash
EMAIL_RATE_LIMIT_USER_HOURLY=10     # Per user per hour
EMAIL_RATE_LIMIT_USER_DAILY=50      # Per user per day
EMAIL_RATE_LIMIT_GLOBAL_HOURLY=1000 # Total per hour
```

### Type-Specific Limits

Some email types have stricter limits:

- Verification: 5 per hour
- Password Reset: 3 per hour
- Magic Link: 5 per hour
- MFA Code: 10 per hour

### Check Rate Limit

```typescript
const check = await rateLimiterService.checkUserLimit(userId, EmailType.VERIFICATION);

if (!check.allowed) {
  console.log(`Rate limit exceeded. Reset at: ${check.info.resetAt}`);
}
```

### Get User Status

```typescript
const status = await rateLimiterService.getUserRateLimitStatus(userId);

console.log(`Used ${status.hourlyUsed}/${status.hourlyLimit} emails this hour`);
console.log(`Used ${status.dailyUsed}/${status.dailyLimit} emails today`);
```

---

## Tracking & Analytics

### Delivery Status

```typescript
const status = await trackingService.getDeliveryStatus(messageId);

console.log(`Status: ${status.status}`);
console.log(`Delivered: ${status.deliveredAt}`);
console.log(`Opened: ${status.openedAt}`);
console.log(`Clicked: ${status.clickedAt}`);
```

### Email Statistics

```typescript
const stats = await trackingService.getEmailStats(
  startDate,
  endDate
);

console.log(`Delivery Rate: ${stats.deliveryRate}%`);
console.log(`Bounce Rate: ${stats.bounceRate}%`);
console.log(`Complaint Rate: ${stats.complaintRate}%`);
```

### User Email History

```typescript
const history = await trackingService.getUserEmailHistory(userId, 50);

history.forEach(email => {
  console.log(`${email.emailType}: ${email.subject} - ${email.status}`);
});
```

### Webhook Integration

Configure webhooks in your email provider:

- **SendGrid**: `https://your-domain.com/api/v1/email/webhook/sendgrid`
- **AWS SES**: `https://your-domain.com/api/v1/email/webhook/ses` (via SNS)

Webhooks automatically update delivery status in the database.

---

## Testing

### Unit Tests

```bash
npm run test src/email/
```

### Integration Tests

```bash
npm run test:e2e src/email/
```

### Test Email Sending

#### Development Mode (Stub Provider)

```bash
EMAIL_SERVICE=stub
EMAIL_PREVIEW_MODE=true
EMAIL_CAPTURE_DIR=./email-previews
```

Emails are saved as HTML files in `./email-previews/`

#### Test with Real Provider

```bash
EMAIL_SERVICE=sendgrid
EMAIL_TEST_RECIPIENT=test@example.com
```

All emails will be sent to `test@example.com` regardless of actual recipient.

#### Using Ethereal (Fake SMTP)

```typescript
// Generate test account
const testAccount = await nodemailer.createTestAccount();

// Configure SMTP
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=${testAccount.user}
SMTP_PASSWORD=${testAccount.pass}
```

View emails at: `https://ethereal.email/messages`

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Choose email provider (SendGrid/SES)
- [ ] Set up provider account
- [ ] Verify domain with provider
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Set up webhook endpoints
- [ ] Configure environment variables
- [ ] Run database migration
- [ ] Test all email types
- [ ] Configure rate limits
- [ ] Set up monitoring and alerts

### DNS Records

#### SPF Record

```
v=spf1 include:sendgrid.net ~all
# or for SES
v=spf1 include:amazonses.com ~all
```

#### DKIM Record

Provider will give you DKIM records to add to your DNS.

#### DMARC Record

```
v=DMARC1; p=quarantine; rua=mailto:postmaster@deepref.ai
```

### Monitoring

Monitor these metrics:

- **Delivery Rate**: Should be >95%
- **Bounce Rate**: Should be <5%
- **Complaint Rate**: Should be <0.1%
- **Queue Health**: Monitor Bull queue statistics

```typescript
const queueStats = await emailService.getQueueStats();
console.log(`Waiting: ${queueStats.waiting}`);
console.log(`Active: ${queueStats.active}`);
console.log(`Failed: ${queueStats.failed}`);
```

### Scaling

- Use Redis cluster for queue
- Run multiple worker processes for queue processing
- Use SES for cost-effective high-volume sending
- Implement email batching for newsletters

### Compliance

- **CAN-SPAM**: Include unsubscribe link in marketing emails
- **GDPR**: Allow users to opt out of communications
- **Privacy**: Don't sell or share email addresses
- **Security**: Use TLS for SMTP connections

---

## Troubleshooting

### Emails Not Sending

1. Check provider configuration
2. Verify domain with provider
3. Check rate limits
4. Review queue statistics
5. Check email logs in database

### High Bounce Rate

1. Validate email addresses before sending
2. Remove invalid addresses from database
3. Use double opt-in for signups
4. Monitor bounce webhooks

### Emails Going to Spam

1. Configure SPF, DKIM, DMARC records
2. Warm up IP address (SES)
3. Avoid spam trigger words
4. Include unsubscribe link
5. Maintain good sender reputation

### Queue Backlog

1. Increase worker processes
2. Optimize email template rendering
3. Check Redis performance
4. Review rate limits

---

## API Reference

### EmailService

- `sendVerificationEmail(email, code, userId?)`
- `sendMagicLinkEmail(email, link, userId?)`
- `sendPasswordResetEmail(email, link, userId?)`
- `sendMfaCodeEmail(email, code, userId?)`
- `sendSecurityAlert(email, message, userId?, type?)`
- `sendWelcomeEmail(email, name, userId?)`
- `sendReferenceRequestEmail(email, requesterName, url, userId?)`
- `sendKycStatusEmail(email, status, reason?, userId?)`
- `sendTemplatedEmail(type, email, context, options?)`
- `sendDirect(options, type, userId?)`
- `getQueueStats()`
- `verifyConnection()`

### EmailTrackingService

- `logEmailSend(data)`
- `updateEmailStatus(messageId, status, error?)`
- `getDeliveryStatus(messageId)`
- `getEmailStats(startDate, endDate)`
- `getUserEmailHistory(userId, limit?)`
- `getStatsByType(startDate, endDate)`

### EmailRateLimiterService

- `checkUserLimit(userId, emailType)`
- `checkGlobalLimit()`
- `checkRecipientLimit(email, emailType, limitMinutes?)`
- `getUserRateLimitStatus(userId)`

---

## Support

For issues or questions:

- Check [DELIVERABLES.md](../DELIVERABLES.md)
- Review logs in `logs/` directory
- Contact DevOps team
