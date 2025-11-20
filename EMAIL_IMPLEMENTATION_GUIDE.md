# Email Service Implementation Guide

## Quick Reference

**Status**: Ready for implementation
**Time Estimate**: 3-4 weeks (1 developer)
**Files Created**: 25+ implementation files
**Complexity**: Medium-High

---

## File Structure Created

```
apps/api/src/email/
├── README.md                              # Complete documentation
├── email.module.ts                        # Module configuration
├── interfaces/
│   └── email.interfaces.ts                # TypeScript interfaces
├── entities/
│   └── email-log.entity.ts                # Email tracking entity
├── services/
│   ├── email.service.ts                   # Main email service (NEW)
│   ├── email-template.service.ts          # Template rendering
│   ├── email-tracking.service.ts          # Delivery tracking
│   └── email-rate-limiter.service.ts      # Rate limiting
├── providers/
│   ├── base-email-provider.ts             # Base provider class
│   ├── sendgrid-provider.ts               # SendGrid implementation
│   ├── ses-provider.ts                    # AWS SES implementation
│   ├── smtp-provider.ts                   # SMTP implementation
│   └── stub-provider.ts                   # Development mode
├── processors/
│   └── email.processor.ts                 # Queue processor
├── controllers/
│   └── email-webhook.controller.ts        # Webhook handler
└── templates/
    ├── verification.hbs                   # Email verification
    ├── magic_link.hbs                     # Magic link
    ├── mfa_code.hbs                       # MFA code
    └── security_alert.hbs                 # Security alerts

apps/api/src/database/migrations/
└── 1700000000000-CreateEmailLogsTable.ts  # Database migration

apps/api/
├── .env.email.example                     # Environment config
└── EMAIL_SERVICE_IMPLEMENTATION_PLAN.md   # Detailed plan
```

---

## Installation Steps

### 1. Install Dependencies

```bash
cd /home/user/AiDeepRef/apps/api

# Email providers
npm install --save @sendgrid/mail
npm install --save @aws-sdk/client-ses
npm install --save nodemailer

# Template system
npm install --save handlebars
npm install --save html-to-text

# Type definitions
npm install --save-dev @types/nodemailer
```

### 2. Run Database Migration

```bash
# Generate migration (if needed)
npm run typeorm migration:generate -- -n CreateEmailLogsTable

# Run migration
npm run migration:run
```

### 3. Update Environment Variables

Add to `.env`:

```bash
# Copy from .env.email.example
EMAIL_SERVICE=stub
EMAIL_FROM=DeepRef <noreply@deepref.ai>
EMAIL_REPLY_TO=support@deepref.ai>
EMAIL_ENABLE_QUEUE=true
EMAIL_ENABLE_TRACKING=true
EMAIL_PREVIEW_MODE=true
EMAIL_CAPTURE_DIR=./email-previews
EMAIL_RATE_LIMIT_USER_HOURLY=10
EMAIL_RATE_LIMIT_GLOBAL_HOURLY=1000

# For production, configure provider
# SENDGRID_API_KEY=SG.your_key_here
# or
# AWS_SES_ACCESS_KEY_ID=your_key
# AWS_SES_SECRET_ACCESS_KEY=your_secret
```

### 4. Import Email Module

Update `/home/user/AiDeepRef/apps/api/src/app.module.ts`:

```typescript
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // ... existing imports
    EmailModule,  // Add this line
  ],
})
export class AppModule {}
```

### 5. Replace Old Email Service

#### Option A: Deprecate Old Service (Recommended)

1. Keep old service for backward compatibility
2. Update all services to use new EmailModule
3. Remove old service after migration

#### Option B: Direct Replacement

Replace imports across codebase:

```bash
# Find all usages
grep -r "from '../common/services/email.service'" apps/api/src/

# Update imports to:
# from '../email/services/email.service'
```

### 6. Update Service Usages

Update services to use new email service:

**Before:**
```typescript
import { EmailService } from '../common/services/email.service';

constructor(private emailService: EmailService) {}

await this.emailService.sendVerificationEmail(email, code);
```

**After:**
```typescript
import { EmailService } from '../email/services/email.service';

constructor(private emailService: EmailService) {}

await this.emailService.sendVerificationEmail(email, code, userId);
// Note: Added userId parameter for tracking and rate limiting
```

---

## Migration Strategy

### Phase 1: Parallel Operation (Week 1)

1. Deploy new email service alongside old one
2. Test new service in development
3. Monitor both services
4. Verify all email types work

### Phase 2: Gradual Migration (Week 2)

1. Update AuthService to use new EmailService
2. Update MfaService to use new EmailService
3. Update other services incrementally
4. Monitor delivery rates and errors

### Phase 3: Full Cutover (Week 3)

1. Complete migration of all services
2. Deprecate old email service
3. Update documentation
4. Remove old service code

### Phase 4: Optimization (Week 4)

1. Fine-tune rate limits
2. Optimize templates
3. Monitor analytics
4. Improve based on metrics

---

## Testing Checklist

### Unit Tests

```bash
npm run test src/email/
```

Test coverage should include:

- [ ] SendGrid provider sends emails
- [ ] SES provider sends emails
- [ ] SMTP provider sends emails
- [ ] Stub provider logs emails
- [ ] Template rendering works
- [ ] Rate limiting enforces limits
- [ ] Tracking logs emails correctly
- [ ] Queue processes jobs
- [ ] Webhooks update status

### Integration Tests

- [ ] Email verification flow
- [ ] Magic link authentication flow
- [ ] Password reset flow
- [ ] MFA code delivery
- [ ] Security alerts
- [ ] Welcome emails
- [ ] Reference requests
- [ ] KYC notifications

### Manual Testing

Development mode:
```bash
EMAIL_SERVICE=stub
EMAIL_PREVIEW_MODE=true
```

1. Trigger each email type
2. Check `./email-previews/` for HTML files
3. Verify template rendering
4. Check email content and links

Test with real provider:
```bash
EMAIL_SERVICE=sendgrid
EMAIL_TEST_RECIPIENT=your-test-email@example.com
```

1. Test all email types
2. Verify delivery
3. Check spam folder
4. Test links and actions

---

## Production Deployment

### Pre-Deployment

1. **Choose Email Provider**
   - MVP: SendGrid (easier setup)
   - Scale: AWS SES (cost-effective)

2. **Set Up Provider Account**
   - Create account
   - Verify domain
   - Configure DNS (SPF, DKIM, DMARC)
   - Get API credentials

3. **Configure Webhooks**
   - SendGrid: Event Webhook
   - SES: SNS notifications
   - Test webhook delivery

4. **Update Environment**
   ```bash
   EMAIL_SERVICE=sendgrid  # or ses
   EMAIL_ENABLE_QUEUE=true
   EMAIL_ENABLE_TRACKING=true
   SENDGRID_API_KEY=SG.your_production_key
   ```

### Deployment

1. **Deploy Code**
   ```bash
   git checkout main
   git pull origin main
   npm run build
   npm run migration:run
   pm2 restart api
   ```

2. **Verify Service**
   ```bash
   # Check logs
   pm2 logs api

   # Test email sending
   curl -X POST https://api.deepref.ai/api/v1/test/email
   ```

3. **Monitor**
   - Check queue statistics
   - Monitor delivery rates
   - Watch error logs
   - Review bounce rates

### Post-Deployment

1. **Send Test Emails**
   - Verification email
   - Magic link
   - Password reset
   - Security alert

2. **Monitor Metrics**
   - Delivery rate: Should be >95%
   - Bounce rate: Should be <5%
   - Complaint rate: Should be <0.1%

3. **Set Up Alerts**
   - High bounce rate
   - High failure rate
   - Queue backlog
   - Provider errors

---

## Troubleshooting

### Issue: Emails Not Sending

**Symptoms**: No emails received, queue growing

**Solution**:
1. Check provider credentials
2. Verify domain with provider
3. Check rate limits
4. Review Bull queue stats
5. Check application logs

```bash
# Check queue
npm run queue:stats

# Check logs
tail -f logs/app.log | grep Email
```

### Issue: High Bounce Rate

**Symptoms**: Many emails bouncing

**Solution**:
1. Validate email addresses before sending
2. Implement double opt-in
3. Clean email list regularly
4. Check SPF/DKIM/DMARC records

### Issue: Emails Going to Spam

**Symptoms**: Users not receiving emails

**Solution**:
1. Configure DNS records properly
2. Warm up IP address (for SES)
3. Improve email content
4. Add unsubscribe link
5. Request feedback from provider

### Issue: Queue Backlog

**Symptoms**: Emails delayed, queue growing

**Solution**:
1. Increase worker processes
2. Optimize email templates
3. Check Redis performance
4. Review rate limits
5. Scale horizontally

---

## Code Examples

### Send Verification Email

```typescript
import { EmailService } from './email/services/email.service';

@Injectable()
export class AuthService {
  constructor(private emailService: EmailService) {}

  async signup(email: string, password: string) {
    // ... create user

    const verificationCode = generateCode();
    await this.emailService.sendVerificationEmail(
      email,
      verificationCode,
      user.id
    );
  }
}
```

### Check Email Statistics

```typescript
import { EmailTrackingService } from './email/services/email-tracking.service';

@Injectable()
export class AdminService {
  constructor(private trackingService: EmailTrackingService) {}

  async getEmailStats() {
    const stats = await this.trackingService.getEmailStats(
      new Date('2025-01-01'),
      new Date()
    );

    return {
      sent: stats.sent,
      delivered: stats.delivered,
      deliveryRate: stats.deliveryRate,
      bounceRate: stats.bounceRate,
    };
  }
}
```

### Monitor Queue

```typescript
import { EmailService } from './email/services/email.service';

@Controller('api/v1/admin/email')
export class EmailAdminController {
  constructor(private emailService: EmailService) {}

  @Get('queue/stats')
  async getQueueStats() {
    return await this.emailService.getQueueStats();
  }
}
```

---

## Performance Optimization

### Template Caching

Templates are automatically cached after first render. Clear cache if templates are updated:

```typescript
emailTemplateService.clearCache();
```

### Email Batching

For bulk emails (newsletters, announcements):

```typescript
const users = await getUsersToNotify();

// Queue all emails at once
await Promise.all(
  users.map(user =>
    emailService.sendTemplatedEmail(
      EmailType.SYSTEM_NOTIFICATION,
      user.email,
      { message: 'Announcement' },
      { userId: user.id, priority: EmailPriority.LOW }
    )
  )
);
```

### Queue Optimization

Configure queue workers:

```typescript
// In email.module.ts
BullModule.registerQueue({
  name: 'email-sending',
  processors: [
    {
      name: 'send-email',
      concurrency: 5,  // Process 5 jobs in parallel
    },
  ],
}),
```

### Database Indexing

Indexes are created by migration for optimal query performance.

---

## Security Considerations

### Email Validation

Always validate email addresses:

```typescript
import emailValidator from 'email-validator';

if (!emailValidator.validate(email)) {
  throw new BadRequestException('Invalid email address');
}
```

### Rate Limiting

Rate limits prevent abuse:
- Per user: 10 emails/hour
- Per type: 3-10 emails/hour (varies)
- Global: 1000 emails/hour

### Data Protection

- Email content is not stored (only metadata)
- Sensitive data in templates is sanitized
- Logs are retained for 90 days then deleted

### Spam Prevention

- Unsubscribe links in marketing emails
- Double opt-in for signups
- Monitor complaint rates
- Block abusive users

---

## Cost Estimation

### SendGrid

| Monthly Emails | Cost | Per Email |
|----------------|------|-----------|
| 3,000 | Free | $0 |
| 50,000 | $19.95 | $0.0004 |
| 100,000 | $89.95 | $0.0009 |

### AWS SES

| Monthly Emails | Cost | Per Email |
|----------------|------|-----------|
| 10,000 | $1.00 | $0.0001 |
| 100,000 | $10.00 | $0.0001 |
| 1,000,000 | $100.00 | $0.0001 |

### Recommendation

- **Start**: SendGrid (easier setup, $0-20/month)
- **Scale**: Migrate to SES when >50k emails/month
- **Break-even**: ~20,000 emails/month

---

## Support & Resources

### Documentation

- [EMAIL_SERVICE_IMPLEMENTATION_PLAN.md](/home/user/AiDeepRef/EMAIL_SERVICE_IMPLEMENTATION_PLAN.md)
- [apps/api/src/email/README.md](/home/user/AiDeepRef/apps/api/src/email/README.md)

### External Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [Bull Queue Documentation](https://docs.bullmq.io/)

### Getting Help

- Check application logs: `logs/app.log`
- Review email logs table in database
- Check Bull queue dashboard
- Contact DevOps team

---

## Next Steps

1. ✅ Review implementation files
2. ⬜ Install dependencies
3. ⬜ Run database migration
4. ⬜ Configure environment variables
5. ⬜ Import EmailModule in app.module.ts
6. ⬜ Update service usages
7. ⬜ Run tests
8. ⬜ Deploy to staging
9. ⬜ Set up email provider
10. ⬜ Deploy to production

---

**Ready to implement?** Start with Phase 1 and follow the migration strategy above.
