# Email Service Implementation Plan

## Executive Summary

This document provides a complete implementation plan for a production-ready email notification system for the AiDeepRef platform. The implementation includes multi-provider support (SendGrid, AWS SES, SMTP), asynchronous queue processing, HTML templates, rate limiting, delivery tracking, and comprehensive error handling.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Email Provider Comparison](#email-provider-comparison)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Components](#implementation-components)
5. [Environment Configuration](#environment-configuration)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)
8. [Cost Analysis](#cost-analysis)
9. [Implementation Timeline](#implementation-timeline)

---

## 1. Current State Analysis

### Existing Implementation
- **File**: `/home/user/AiDeepRef/apps/api/src/common/services/email.service.ts`
- **Status**: Stub implementation with basic templates
- **Features**:
  - Email verification codes
  - Magic link authentication
  - Password reset
  - KYC status notifications
  - Basic HTML templates
- **Missing**: Actual email provider integration, queue processing, retry logic, rate limiting, tracking

### Required Email Types
1. ✅ Email verification codes (exists)
2. ✅ Magic link authentication (exists)
3. ✅ Password reset (exists)
4. ⚠️ MFA codes (template exists in email-mfa.service.ts but not in main service)
5. ❌ Security alerts (referenced but not implemented)
6. ❌ Welcome emails
7. ❌ Reference request notifications
8. ❌ System notifications
9. ❌ Account lockout notifications
10. ❌ Suspicious login alerts

---

## 2. Email Provider Comparison

### SendGrid (Recommended for MVP)

**Pros:**
- Easy to set up and use
- Excellent API documentation
- Built-in template management
- Real-time webhooks for delivery tracking
- Good free tier (100 emails/day)
- Detailed analytics dashboard
- Email validation and domain authentication

**Cons:**
- More expensive at scale
- Limited to SendGrid infrastructure

**Pricing:**
- Free: 100 emails/day
- Essentials: $19.95/month (50,000 emails)
- Pro: $89.95/month (100,000 emails)

**Best For:** Startups, quick deployment, analytics needs

### AWS SES (Recommended for Production Scale)

**Pros:**
- Most cost-effective at scale
- Highly reliable infrastructure
- Integrates well with AWS ecosystem
- No daily sending limits (after verification)
- Pay only for what you use

**Cons:**
- Requires AWS account and IAM setup
- More complex initial configuration
- Requires domain verification
- Sandbox mode restrictions initially
- Analytics require additional setup (CloudWatch)

**Pricing:**
- $0.10 per 1,000 emails
- Free tier: 62,000 emails/month (if using EC2)

**Best For:** High-volume sending, AWS infrastructure, cost optimization

### SMTP (Gmail, Mailgun, etc.)

**Pros:**
- Universal standard
- Works with any email provider
- Good for development
- Can use existing email accounts

**Cons:**
- Lower reliability
- Rate limits can be strict
- Limited tracking capabilities
- Potential deliverability issues

**Pricing:**
- Gmail: Free for low volume (500/day limit)
- Mailgun: $35/month (50,000 emails)

**Best For:** Development, testing, small-scale deployments

### Recommendation

**Development/Testing**: SMTP (Gmail)
**MVP/Launch**: SendGrid (easier setup, better analytics)
**Production Scale**: AWS SES (cost-effective, scalable)

**Migration Path**: Start with SendGrid, migrate to AWS SES when sending 50,000+ emails/month

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  AuthService │ MfaService │ SeekersService │ etc.          │
└────────┬─────────────────────────────────────────────────────┘
         │
         │ sendEmail()
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Email Service                             │
├─────────────────────────────────────────────────────────────┤
│  • Provider abstraction                                      │
│  • Template rendering                                        │
│  • Validation & sanitization                                │
│  • Rate limiting check                                       │
└────────┬─────────────────────────────────────────────────────┘
         │
         │ Queue Job
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Email Queue (Bull/Redis)                    │
├─────────────────────────────────────────────────────────────┤
│  • Asynchronous processing                                   │
│  • Retry logic (3 attempts, exponential backoff)            │
│  • Priority queue                                            │
│  • Failed job tracking                                       │
└────────┬─────────────────────────────────────────────────────┘
         │
         │ Process Job
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                Email Processor (Worker)                      │
├─────────────────────────────────────────────────────────────┤
│  • Send via provider                                         │
│  • Log attempts                                              │
│  • Track delivery                                            │
│  • Handle errors                                             │
└────────┬─────────────────────────────────────────────────────┘
         │
         │ HTTP/SMTP
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Email Provider (SendGrid/SES/SMTP)              │
├─────────────────────────────────────────────────────────────┤
│  • Send email                                                │
│  • Delivery tracking                                         │
│  • Bounce/complaint handling                                │
│  • Webhook callbacks                                         │
└─────────────────────────────────────────────────────────────┘
         │
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Email Tracking DB                         │
├─────────────────────────────────────────────────────────────┤
│  • Email logs                                                │
│  • Delivery status                                           │
│  • Open/click tracking                                       │
│  • Bounce/complaint records                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Components

### 4.1 File Structure

```
apps/api/src/
├── email/
│   ├── email.module.ts                  # Email module configuration
│   ├── services/
│   │   ├── email.service.ts             # Main email service
│   │   ├── email-provider.service.ts    # Provider abstraction
│   │   ├── email-template.service.ts    # Template rendering
│   │   ├── email-tracking.service.ts    # Delivery tracking
│   │   └── email-rate-limiter.service.ts # Rate limiting
│   ├── providers/
│   │   ├── base-email-provider.ts       # Base provider interface
│   │   ├── sendgrid-provider.ts         # SendGrid implementation
│   │   ├── ses-provider.ts              # AWS SES implementation
│   │   └── smtp-provider.ts             # SMTP implementation
│   ├── processors/
│   │   └── email.processor.ts           # Bull queue processor
│   ├── templates/
│   │   ├── base.hbs                     # Base template
│   │   ├── verification-code.hbs        # Email verification
│   │   ├── magic-link.hbs               # Magic link
│   │   ├── password-reset.hbs           # Password reset
│   │   ├── mfa-code.hbs                 # MFA code
│   │   ├── security-alert.hbs           # Security alerts
│   │   ├── welcome.hbs                  # Welcome email
│   │   ├── reference-request.hbs        # Reference request
│   │   └── system-notification.hbs      # System notifications
│   ├── entities/
│   │   └── email-log.entity.ts          # Email tracking entity
│   ├── dto/
│   │   ├── send-email.dto.ts
│   │   └── email-webhook.dto.ts
│   ├── interfaces/
│   │   └── email.interfaces.ts
│   └── controllers/
│       └── email-webhook.controller.ts   # Webhook endpoint
└── common/
    └── services/
        └── email.service.ts (deprecated, will be replaced)
```

### 4.2 Dependencies to Install

```bash
npm install --save @sendgrid/mail
npm install --save @aws-sdk/client-ses
npm install --save nodemailer
npm install --save handlebars
npm install --save mjml
npm install --save html-to-text
npm install --save email-validator
npm install --save dompurify
npm install --save isomorphic-dompurify

npm install --save-dev @types/nodemailer
npm install --save-dev @types/mjml
```

---

## 5. Environment Configuration

### Required Environment Variables

```bash
# Email Service Configuration
EMAIL_SERVICE=sendgrid                    # 'sendgrid', 'ses', or 'smtp'
EMAIL_FROM=DeepRef <noreply@deepref.ai>
EMAIL_REPLY_TO=support@deepref.ai
EMAIL_ENABLE_QUEUE=true                   # Use queue for async processing
EMAIL_ENABLE_TRACKING=true                # Track email delivery
EMAIL_RATE_LIMIT=100                      # Max emails per user per hour
EMAIL_RATE_LIMIT_GLOBAL=1000              # Max emails per hour globally

# Development Mode
EMAIL_PREVIEW_MODE=false                  # Preview emails instead of sending
EMAIL_CAPTURE_DIR=./email-previews        # Directory for email previews
EMAIL_TEST_RECIPIENT=                     # Override recipient in dev mode

# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_WEBHOOK_SECRET=xxxxxxxxxxxxx     # For webhook verification

# AWS SES Configuration
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SES_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_SES_CONFIGURATION_SET=deepref-emails  # For tracking

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false                         # true for 465, false for 587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email Queue Configuration
EMAIL_QUEUE_NAME=email-sending
EMAIL_QUEUE_ATTEMPTS=3                    # Retry attempts
EMAIL_QUEUE_BACKOFF_DELAY=5000           # Initial backoff delay (ms)
EMAIL_QUEUE_BACKOFF_TYPE=exponential     # 'fixed' or 'exponential'

# Template Configuration
EMAIL_TEMPLATE_DIR=./src/email/templates
EMAIL_BASE_URL=https://deepref.ai
EMAIL_LOGO_URL=https://deepref.ai/logo.png
EMAIL_SUPPORT_URL=https://deepref.ai/support
EMAIL_UNSUBSCRIBE_URL=https://deepref.ai/unsubscribe

# Compliance
EMAIL_COMPANY_NAME=DeepRef
EMAIL_COMPANY_ADDRESS=123 Main St, City, State 12345
EMAIL_PRIVACY_URL=https://deepref.ai/privacy
EMAIL_TERMS_URL=https://deepref.ai/terms
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// email.service.spec.ts
describe('EmailService', () => {
  it('should queue email for sending')
  it('should validate email addresses')
  it('should sanitize HTML content')
  it('should render templates correctly')
  it('should enforce rate limits')
  it('should handle provider failures')
  it('should retry failed sends')
})
```

### 6.2 Integration Tests

```typescript
// email-integration.spec.ts
describe('Email Integration', () => {
  it('should send email via SendGrid')
  it('should send email via SES')
  it('should send email via SMTP')
  it('should track delivery status')
  it('should handle webhook callbacks')
  it('should process queue jobs')
})
```

### 6.3 Testing Services

**Development:**
- Use Ethereal Email (https://ethereal.email) - fake SMTP service
- Use MailHog - local email testing server
- Preview mode (save emails as HTML files)

**Staging:**
- Use Mailtrap (https://mailtrap.io) - email sandbox
- Test email addresses with + addressing (user+test@example.com)

**Production:**
- Start with small volume
- Monitor delivery rates and bounces
- Use A/B testing for templates

---

## 7. Deployment Checklist

### Pre-deployment

- [ ] Choose email provider (SendGrid/SES/SMTP)
- [ ] Set up email provider account
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Verify domain with provider
- [ ] Set up webhook endpoints
- [ ] Configure environment variables
- [ ] Test all email types
- [ ] Review email templates
- [ ] Set up monitoring and alerts
- [ ] Configure rate limits

### Post-deployment

- [ ] Monitor delivery rates (should be >95%)
- [ ] Monitor bounce rates (should be <5%)
- [ ] Monitor complaint rates (should be <0.1%)
- [ ] Set up email alerts for failures
- [ ] Review email logs regularly
- [ ] Monitor queue health
- [ ] Test unsubscribe flow
- [ ] Verify webhook processing

---

## 8. Cost Analysis

### SendGrid Pricing (Monthly)

| Volume | Plan | Cost | Cost per 1K |
|--------|------|------|-------------|
| 3,000 | Free | $0 | $0 |
| 50,000 | Essentials | $19.95 | $0.40 |
| 100,000 | Pro | $89.95 | $0.90 |
| 500,000 | Pro | $349.95 | $0.70 |

### AWS SES Pricing

| Volume | Cost | Cost per 1K |
|--------|------|-------------|
| 1,000 | $0.10 | $0.10 |
| 10,000 | $1.00 | $0.10 |
| 100,000 | $10.00 | $0.10 |
| 1,000,000 | $100.00 | $0.10 |

**Additional SES Costs:**
- Dedicated IP: $24.95/month (optional)
- Data transfer: ~$0.12/GB (minimal for emails)

### SMTP (Gmail)

| Volume | Cost | Notes |
|--------|------|-------|
| <500/day | Free | Gmail limit |
| >500/day | Not recommended | Use paid provider |

### Cost Projection for AiDeepRef

**Assumptions:**
- 1,000 users
- 10 emails per user per month
- 10,000 emails/month
- Growth: 50% per quarter

| Quarter | Users | Emails/Month | SendGrid Cost | SES Cost | Savings |
|---------|-------|--------------|---------------|----------|---------|
| Q1 | 1,000 | 10,000 | $19.95 | $1.00 | $18.95 |
| Q2 | 1,500 | 15,000 | $19.95 | $1.50 | $18.45 |
| Q3 | 2,250 | 22,500 | $19.95 | $2.25 | $17.70 |
| Q4 | 3,375 | 33,750 | $19.95 | $3.38 | $16.57 |
| Year 2 | 10,000 | 100,000 | $89.95 | $10.00 | $79.95 |

**Recommendation:**
- **Months 1-6**: Use SendGrid (easier setup, better analytics)
- **Months 6+**: Migrate to AWS SES (better cost scaling)
- **Break-even point**: ~20,000 emails/month

---

## 9. Implementation Timeline

### Phase 1: Foundation (Week 1)
**Days 1-2: Email Service Infrastructure**
- Set up email module structure
- Implement base email service
- Create provider abstraction layer
- Configure SendGrid provider
- Set up environment variables
- **Deliverable**: Basic email sending working with SendGrid

**Days 3-4: Queue System**
- Set up Bull queue for emails
- Implement email processor
- Add retry logic and error handling
- Configure queue monitoring
- **Deliverable**: Asynchronous email sending with retries

**Day 5: Testing**
- Write unit tests
- Write integration tests
- Test with Ethereal/Mailtrap
- **Deliverable**: Test coverage >80%

### Phase 2: Templates & Features (Week 2)
**Days 1-2: Template System**
- Set up Handlebars templates
- Convert existing templates to Handlebars
- Create new templates (welcome, reference request, etc.)
- Implement template rendering service
- Add MJML support for responsive emails
- **Deliverable**: All email templates implemented

**Days 3-4: Advanced Features**
- Implement email tracking
- Add rate limiting
- Create webhook endpoint for delivery tracking
- Implement bounce/complaint handling
- **Deliverable**: Full-featured email system

**Day 5: Integration**
- Replace old email service references
- Update all services to use new email service
- Migration and testing
- **Deliverable**: System-wide integration complete

### Phase 3: Production Readiness (Week 3)
**Days 1-2: Additional Providers**
- Implement AWS SES provider
- Implement SMTP provider
- Add provider switching logic
- Test all providers
- **Deliverable**: Multi-provider support

**Days 3-4: Monitoring & Compliance**
- Set up email logging
- Implement unsubscribe functionality
- Add email preferences management
- Ensure CAN-SPAM compliance
- GDPR considerations
- **Deliverable**: Compliant, monitored email system

**Day 5: Documentation & Deployment**
- Write deployment guide
- Document email templates
- Create runbook for operations
- Production deployment
- **Deliverable**: Production-ready email system

### Phase 4: Optimization (Week 4)
**Days 1-2: Performance**
- Optimize queue processing
- Implement email batching
- Add caching for templates
- Performance testing
- **Deliverable**: Optimized system

**Days 3-5: Analytics & Reporting**
- Build email analytics dashboard
- Implement delivery reports
- Set up alerting for failures
- A/B testing framework for templates
- **Deliverable**: Complete email platform

---

## Summary

**Total Implementation Time**: 3-4 weeks (1 developer)

**Key Deliverables**:
1. Production-ready email service with multi-provider support
2. Asynchronous queue processing with retry logic
3. Professional HTML email templates
4. Email tracking and analytics
5. Rate limiting and compliance features
6. Comprehensive testing suite
7. Complete documentation

**Recommended Approach**:
- Start with SendGrid for quick MVP deployment
- Implement full feature set in phases
- Monitor and optimize based on usage patterns
- Migrate to AWS SES when volume justifies cost savings

**Success Metrics**:
- Email delivery rate: >95%
- Bounce rate: <5%
- Complaint rate: <0.1%
- Average queue processing time: <30 seconds
- Failed job rate: <1%

---

## Next Steps

1. Review and approve this implementation plan
2. Choose initial email provider (recommend: SendGrid for MVP)
3. Set up email provider account and verify domain
4. Begin Phase 1 implementation
5. Schedule weekly progress reviews
