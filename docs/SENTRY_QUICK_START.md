# Sentry Quick Start Guide

Quick reference for developers working with Sentry in the DeepRef project.

## Environment Setup

### Backend (.env)
```bash
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% in dev
```

### Frontend (Runtime)
```typescript
// Set in window object or environment file
window.SENTRY_DSN = 'https://your-key@sentry.io/project-id';
```

---

## Backend Usage

### Manual Error Capture

```typescript
import { SentryService } from '@/monitoring';

@Injectable()
export class MyService {
  constructor(private sentry: SentryService) {}

  async processData(data: any) {
    try {
      // Your code
    } catch (error) {
      this.sentry.captureException(error, {
        tags: { operation: 'processData' },
        extra: { dataId: data.id },
      });
      throw error;
    }
  }
}
```

### Performance Tracking

```typescript
import * as Sentry from '@sentry/node';

async function expensiveOperation() {
  const transaction = Sentry.startTransaction({
    name: 'expensive-operation',
    op: 'task',
  });

  try {
    const span = transaction.startChild({
      op: 'db.query',
      description: 'Complex query',
    });

    // Your code
    await complexQuery();

    span.finish();
  } finally {
    transaction.finish();
  }
}
```

### User Context

```typescript
// Automatically set by UserContextInterceptor for authenticated requests
// Or manually:
this.sentry.setUser({
  id: user.id,
  email: user.email,
  role: user.role,
});
```

### Custom Metrics

```typescript
// Track API latency
this.sentry.trackDistribution(
  'api.custom_endpoint',
  duration,
  'millisecond',
  { endpoint: '/custom' }
);

// Count events
this.sentry.incrementCounter('user.signup', 1);

// Track value
this.sentry.trackMetric('cache.size', 1024, 'byte');
```

---

## Frontend Usage

### Manual Error Capture

```typescript
import { SentryService } from '@app/core/monitoring';

@Component({ /* ... */ })
export class MyComponent {
  constructor(private sentry: SentryService) {}

  handleAction() {
    try {
      // Your code
    } catch (error) {
      this.sentry.captureException(error, {
        tags: { component: 'MyComponent' },
      });
    }
  }
}
```

### User Feedback

```typescript
import { SentryFeedbackComponent } from '@app/shared/components/sentry-feedback';

@Component({
  template: `
    <app-sentry-feedback
      [eventId]="errorEventId"
      [autoShow]="showFeedback">
    </app-sentry-feedback>
  `
})
export class ErrorPage {
  errorEventId?: string;
  showFeedback = true;
}
```

### Performance Tracking

```typescript
import * as Sentry from '@sentry/angular';

@Component({ /* ... */ })
export class DataComponent implements OnInit {
  ngOnInit() {
    const transaction = Sentry.startTransaction({
      name: 'DataComponent.init',
      op: 'component.init',
    });

    const span = transaction.startChild({
      op: 'http.client',
      description: 'Load data',
    });

    this.loadData().then(() => {
      span.finish();
      transaction.finish();
    });
  }
}
```

### Breadcrumbs

```typescript
// Automatic breadcrumbs are added for:
// - Navigation
// - HTTP requests
// - Console logs
// - User clicks

// Add custom breadcrumb:
this.sentry.addBreadcrumb({
  message: 'User started checkout',
  category: 'user-action',
  level: 'info',
  data: { cartValue: 99.99 },
});
```

---

## Testing

### Mock Sentry in Tests

```typescript
// Backend
jest.mock('@sentry/node');

// Frontend
class MockSentryService {
  captureException = jest.fn();
  captureMessage = jest.fn();
  setUser = jest.fn();
}

TestBed.configureTestingModule({
  providers: [
    { provide: SentryService, useClass: MockSentryService }
  ]
});
```

---

## Common Patterns

### Don't Capture Expected Errors

```typescript
// ❌ Bad - Captures validation errors
if (!isValid(data)) {
  sentry.captureException(new Error('Invalid data'));
  throw new BadRequestException('Invalid data');
}

// ✅ Good - Only log unexpected errors
if (!isValid(data)) {
  throw new BadRequestException('Invalid data');
}
```

### Filter Sensitive Data

```typescript
// Already handled automatically, but be aware:
// - Passwords, tokens, API keys filtered
// - Email addresses masked
// - Credit card numbers removed

// If you need to add sensitive data:
sentry.captureException(error, {
  extra: {
    userId: user.id, // ✅ OK
    email: maskEmail(user.email), // ✅ OK
    password: user.password, // ❌ Filtered automatically
  }
});
```

### Tag for Searchability

```typescript
// Good tags:
sentry.setTags({
  feature: 'references',
  operation: 'create',
  userType: 'seeker',
});

// Search in Sentry: tag:feature:references
```

---

## Troubleshooting

### Events Not Appearing

1. Check DSN is set: `echo $SENTRY_DSN`
2. Check sampling rate: Should be 1.0 in development
3. Check network: `curl https://sentry.io/api/0/`
4. Check logs for Sentry errors

### Source Maps Not Working

1. Ensure build generates source maps
2. Verify source maps uploaded to Sentry
3. Check release version matches: `sentry-cli releases list`

### Too Many Events

1. Reduce sampling rate in production
2. Add ignore filters in `beforeSend`
3. Implement rate limiting for specific errors

---

## Quick Links

- **Sentry Dashboard**: https://sentry.io/organizations/deepref/
- **API Project**: https://sentry.io/organizations/deepref/projects/deepref-api/
- **Web Project**: https://sentry.io/organizations/deepref/projects/deepref-web/
- **Full Runbook**: [/docs/monitoring-runbook.md](/docs/monitoring-runbook.md)
- **Implementation Summary**: [/docs/SENTRY_IMPLEMENTATION_SUMMARY.md](/docs/SENTRY_IMPLEMENTATION_SUMMARY.md)

---

**Need Help?** Ask in #engineering or #devops Slack channels
