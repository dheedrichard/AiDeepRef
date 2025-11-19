# DeepRef Monitoring Runbook

## Overview

This runbook provides comprehensive guidance for monitoring the DeepRef platform using Sentry APM. It covers setup, dashboard usage, alert response procedures, and troubleshooting common issues.

## Table of Contents

1. [Sentry Setup](#sentry-setup)
2. [Dashboard Overview](#dashboard-overview)
3. [Alert Response Procedures](#alert-response-procedures)
4. [Performance Optimization](#performance-optimization)
5. [Common Error Patterns](#common-error-patterns)
6. [On-Call Procedures](#on-call-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Sentry Setup

### Environment Variables

#### Backend (apps/api/.env)
```bash
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production # or development, staging
SENTRY_RELEASE=1.0.0 # Auto-set by CI/CD
SENTRY_TRACES_SAMPLE_RATE=0.2 # 20% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.05 # 5% profiling
SENTRY_ENABLE_PROFILING=true
```

#### Frontend (apps/web/environment.ts)
```typescript
sentry: {
  dsn: 'https://your-dsn@sentry.io/project-id',
  environment: 'production',
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}
```

### GitHub Secrets

Configure these secrets in GitHub repository settings:

- `SENTRY_ORG`: Your Sentry organization slug
- `SENTRY_PROJECT_API`: Backend project name
- `SENTRY_PROJECT_WEB`: Frontend project name
- `SENTRY_AUTH_TOKEN`: Authentication token for Sentry CLI

### Verification

After deployment, verify Sentry is working:

1. **Backend**: Check logs for `✅ Sentry initialized for environment: production`
2. **Frontend**: Open browser console, should see no Sentry errors
3. **Sentry Dashboard**: Go to Sentry web UI, check for recent events

---

## Dashboard Overview

### Custom Dashboard Widgets

#### 1. Error Rate by Endpoint
**Widget Type**: Time Series
**Query**: `event.type:error grouped by transaction`
**Use**: Identify which endpoints have the highest error rates

#### 2. P95 Latency by Endpoint
**Widget Type**: Time Series
**Query**: `transaction.duration percentile(95) grouped by transaction`
**Use**: Monitor API performance and identify slow endpoints

#### 3. AI Model Performance
**Widget Type**: Table
**Query**: `spans where op:ai.generate grouped by description`
**Metrics**: avg(duration), count()
**Use**: Compare performance across different AI models

#### 4. Database Query Performance
**Widget Type**: Time Series
**Query**: `spans where op:db.query percentile(95) duration`
**Use**: Monitor database performance and identify slow queries

#### 5. Cache Hit Rate
**Widget Type**: Gauge
**Query**: `cache.hits / (cache.hits + cache.misses)`
**Use**: Monitor cache effectiveness

#### 6. User-Facing Error Rate
**Widget Type**: Number
**Query**: `event.type:error and http.status_code:[500 TO 599] count()`
**Use**: Track customer-impacting errors

### Performance Budgets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API P95 Latency | < 500ms | > 500ms | > 2s |
| Frontend LCP | < 2.5s | > 2.5s | > 4s |
| DB Query Time (P95) | < 200ms | > 200ms | > 500ms |
| AI Response Time | < 5s | > 5s | > 10s |
| Error Rate | < 1% | > 1% | > 5% |

---

## Alert Response Procedures

### Alert: Error Rate Spike

**Trigger**: > 10 errors/min for 1 minute

**Response Steps**:

1. **Assess Severity**
   - Check Sentry dashboard for error count and affected users
   - Identify the error type and stack trace
   - Determine if it's a single endpoint or widespread

2. **Immediate Actions**
   ```bash
   # Check recent deployments
   git log --oneline -n 10

   # Check application logs
   kubectl logs -f deployment/deepref-api --tail=100

   # Check system resources
   kubectl top pods
   ```

3. **Mitigation**
   - If caused by recent deployment: Consider rollback
   ```bash
   kubectl rollout undo deployment/deepref-api
   ```
   - If database issue: Check connection pool and query performance
   - If external API issue: Verify API keys and rate limits

4. **Communication**
   - Notify #incidents Slack channel
   - Update status page if customer-facing
   - Post-incident: Write postmortem

### Alert: Slow API Responses

**Trigger**: P95 latency > 2s for 5 minutes

**Response Steps**:

1. **Identify Bottleneck**
   - Check Sentry Performance page
   - Look at transaction waterfall for slow endpoints
   - Identify which span is taking the most time:
     - Database query?
     - External API call?
     - AI model inference?

2. **Database Investigation**
   ```sql
   -- Check for slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;

   -- Check connection pool
   SELECT count(*) as active_connections
   FROM pg_stat_activity
   WHERE state = 'active';
   ```

3. **External API Investigation**
   - Check AI provider status pages (Anthropic, Google, OpenAI)
   - Verify API rate limits not exceeded
   - Check network connectivity

4. **Mitigation**
   - Add database indexes if missing
   - Increase connection pool size if saturated
   - Implement caching for frequently accessed data
   - Add circuit breakers for external APIs

### Alert: Database Connection Failure

**Trigger**: Any database connection error

**Response Steps**:

1. **Immediate Check**
   ```bash
   # Test database connectivity
   psql -h db-host -U username -d deepref -c "SELECT 1"

   # Check connection pool status
   kubectl logs deployment/deepref-api | grep "connection pool"
   ```

2. **Diagnose Issue**
   - Connection pool exhausted?
   - Database server down?
   - Network connectivity issue?
   - Credentials expired?

3. **Mitigation**
   - Restart application pods if connection pool issue
   - Scale database if resource exhaustion
   - Contact database provider if cloud-hosted

### Alert: AI API Failure

**Trigger**: > 5 AI API errors in 5 minutes

**Response Steps**:

1. **Check Provider Status**
   - Anthropic: https://status.anthropic.com
   - Google: https://status.cloud.google.com
   - OpenAI: https://status.openai.com

2. **Verify Configuration**
   ```bash
   # Check API keys are set
   kubectl get secret deepref-secrets -o yaml

   # Check AI service logs
   kubectl logs deployment/deepref-api | grep "AI"
   ```

3. **Implement Fallback**
   - Application should automatically fall back to alternative provider
   - Verify fallback is working in Sentry dashboard
   - If all providers down, enable maintenance mode

### Alert: High Memory Usage

**Trigger**: Memory usage > 80% for 5 minutes

**Response Steps**:

1. **Identify Memory Leak**
   ```bash
   # Check memory usage
   kubectl top pods

   # Get heap snapshot (if Node.js profiling enabled)
   curl http://localhost:3000/debug/heapsnapshot > heap.heapsnapshot
   ```

2. **Immediate Mitigation**
   - Restart affected pods
   - Scale horizontally if needed
   ```bash
   kubectl scale deployment deepref-api --replicas=5
   ```

3. **Investigation**
   - Check Sentry profiling data
   - Look for memory-intensive operations
   - Check for circular references or unclosed resources

---

## Performance Optimization

### Backend Optimization

#### Slow Database Queries

1. **Add Indexes**
   ```sql
   -- Example: Index on frequently queried columns
   CREATE INDEX idx_references_seeker_id ON references(seeker_id);
   CREATE INDEX idx_bundles_created_at ON bundles(created_at DESC);
   ```

2. **Optimize N+1 Queries**
   ```typescript
   // Before (N+1)
   const references = await this.referenceRepository.find();
   for (const ref of references) {
     ref.seeker = await this.seekerRepository.findOne(ref.seekerId);
   }

   // After (optimized)
   const references = await this.referenceRepository.find({
     relations: ['seeker'],
   });
   ```

3. **Use Connection Pooling**
   ```typescript
   // In database config
   extra: {
     max: 20, // Maximum pool size
     min: 5,  // Minimum pool size
     idleTimeoutMillis: 30000,
   }
   ```

#### Caching Strategy

1. **Redis Caching**
   ```typescript
   // Cache frequently accessed data
   @Cacheable('user-profile', 300) // 5 minutes TTL
   async getUserProfile(userId: string): Promise<UserProfile> {
     return this.userRepository.findOne(userId);
   }
   ```

2. **HTTP Caching**
   ```typescript
   // Add cache headers
   @Header('Cache-Control', 'public, max-age=3600')
   @Get('public-data')
   getPublicData() {
     return this.dataService.getPublicData();
   }
   ```

#### AI Response Optimization

1. **Implement Streaming**
   ```typescript
   // Stream AI responses instead of waiting for full completion
   const stream = await this.aiService.generateStream(prompt);
   for await (const chunk of stream) {
     res.write(chunk);
   }
   ```

2. **Batch Requests**
   ```typescript
   // Batch multiple AI requests together
   const results = await this.aiService.batchGenerate([
     { prompt: 'prompt1' },
     { prompt: 'prompt2' },
   ]);
   ```

### Frontend Optimization

#### Reduce Bundle Size

1. **Lazy Loading**
   ```typescript
   // Lazy load routes
   const routes: Routes = [
     {
       path: 'admin',
       loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
     },
   ];
   ```

2. **Tree Shaking**
   ```typescript
   // Import only what you need
   import { map, filter } from 'rxjs/operators'; // Good
   import * as _ from 'lodash'; // Bad - imports entire library
   ```

#### Improve Web Vitals

1. **Optimize LCP (Largest Contentful Paint)**
   - Preload critical resources
   - Optimize images (use WebP, lazy loading)
   - Use CDN for static assets

2. **Optimize FID (First Input Delay)**
   - Minimize JavaScript execution time
   - Use Web Workers for heavy computations
   - Implement code splitting

3. **Optimize CLS (Cumulative Layout Shift)**
   - Set explicit width/height on images
   - Avoid inserting content above existing content
   - Use `transform` animations instead of layout properties

---

## Common Error Patterns

### Pattern 1: "Cannot read property 'X' of undefined"

**Cause**: Accessing properties on undefined/null objects

**Fix**:
```typescript
// Before
const email = user.profile.email;

// After
const email = user?.profile?.email ?? 'N/A';
```

**Sentry Tags**: `error_type: TypeError`

### Pattern 2: "Network request failed"

**Cause**: API endpoint unreachable or network connectivity issue

**Investigation**:
- Check if API is deployed and running
- Verify CORS configuration
- Check network connectivity

**Fix**:
```typescript
// Implement retry logic
async fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### Pattern 3: "Database connection pool exhausted"

**Cause**: Too many concurrent database connections

**Investigation**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Check long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Fix**:
- Increase connection pool size
- Optimize slow queries
- Ensure connections are properly closed
- Implement connection pooling

### Pattern 4: "Rate limit exceeded"

**Cause**: Exceeding AI provider rate limits

**Fix**:
```typescript
// Implement rate limiting
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 50,
  interval: 'minute',
});

async function callAI(prompt: string) {
  await limiter.removeTokens(1);
  return aiClient.generate(prompt);
}
```

---

## On-Call Procedures

### On-Call Rotation

- **Primary**: First responder, handles all alerts
- **Secondary**: Backup, available if primary needs help
- **Escalation**: Engineering manager for critical incidents

### Response Times (SLA)

| Severity | Acknowledgment | Resolution Target |
|----------|---------------|-------------------|
| Critical (P0) | 15 minutes | 2 hours |
| High (P1) | 30 minutes | 4 hours |
| Medium (P2) | 2 hours | 24 hours |
| Low (P3) | 24 hours | 1 week |

### Incident Response Flow

1. **Alert Received** (via PagerDuty/Slack)
   - Acknowledge alert within SLA
   - Create incident in incident management system

2. **Initial Assessment** (5 minutes)
   - Check Sentry dashboard for error details
   - Verify system is up (check status page)
   - Determine severity and impact

3. **Investigation** (varies)
   - Review recent deployments
   - Check logs and metrics
   - Identify root cause

4. **Mitigation** (varies)
   - Apply fix or rollback
   - Monitor for resolution
   - Update stakeholders

5. **Post-Incident** (within 48 hours)
   - Write postmortem
   - Identify action items
   - Update runbook

### Communication Templates

**Initial Notification** (Slack)
```
🚨 INCIDENT: [Brief description]
Severity: [P0/P1/P2/P3]
Impact: [Number of users/% of traffic affected]
Status: Investigating
ETA: [Estimated resolution time]
```

**Update**
```
📊 UPDATE: [Incident name]
Status: [Investigating/Mitigating/Resolved]
Progress: [What's been done]
Next steps: [What's happening next]
ETA: [Updated ETA if changed]
```

**Resolution**
```
✅ RESOLVED: [Incident name]
Duration: [How long incident lasted]
Root cause: [Brief explanation]
Fix applied: [What was done]
Follow-up: [Link to postmortem]
```

---

## Troubleshooting

### Sentry Not Receiving Events

**Symptoms**: No events showing in Sentry dashboard

**Checks**:

1. **Verify DSN is set**
   ```bash
   # Backend
   echo $SENTRY_DSN

   # Frontend
   # Check browser console for initialization message
   ```

2. **Check network connectivity**
   ```bash
   # Test connection to Sentry
   curl -I https://sentry.io
   ```

3. **Verify sampling rate**
   - In development, set `tracesSampleRate: 1.0`
   - Check if events are being sampled out

4. **Check for errors in logs**
   ```bash
   # Look for Sentry initialization errors
   kubectl logs deployment/deepref-api | grep -i sentry
   ```

### Source Maps Not Working

**Symptoms**: Stack traces show minified code

**Checks**:

1. **Verify source maps are uploaded**
   ```bash
   sentry-cli releases files $RELEASE list
   ```

2. **Check release matches**
   - Ensure `SENTRY_RELEASE` environment variable matches uploaded release

3. **Verify source map format**
   - Source maps should be uploaded to Sentry
   - Files should be in correct directory structure

### High Sentry Quota Usage

**Symptoms**: Reaching Sentry event quota limits

**Solutions**:

1. **Adjust sampling rates**
   ```typescript
   // Reduce from 20% to 10%
   tracesSampleRate: 0.1
   ```

2. **Filter noisy errors**
   ```typescript
   beforeSend(event) {
     // Ignore specific errors
     if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
       return null;
     }
     return event;
   }
   ```

3. **Use event grouping**
   - Configure fingerprinting to group similar errors
   - Reduces duplicate events

---

## Appendix

### Useful Sentry CLI Commands

```bash
# List releases
sentry-cli releases list

# Create new release
sentry-cli releases new VERSION

# Upload source maps
sentry-cli releases files VERSION upload-sourcemaps ./dist

# Finalize release
sentry-cli releases finalize VERSION

# Create deployment
sentry-cli releases deploys VERSION new -e production

# View issues
sentry-cli issues list

# Resolve issue
sentry-cli issues resolve ISSUE_ID
```

### Monitoring Metrics Reference

**Backend Metrics**:
- `api.latency`: API endpoint latency (ms)
- `api.requests`: Request count
- `api.errors`: Error count
- `db.query_time`: Database query duration (ms)
- `db.connection_pool_usage`: Connection pool utilization (%)
- `ai.response_time`: AI model response time (ms)
- `cache.hit_rate`: Cache hit rate (%)

**Frontend Metrics**:
- `page.load_time`: Page load duration (ms)
- `component.load_time`: Component initialization time (ms)
- `api.call_duration`: API call duration (ms)
- `state.update_duration`: State update time (ms)

### Contact Information

- **Engineering Manager**: [manager@deepref.com]
- **DevOps Lead**: [devops@deepref.com]
- **On-Call Schedule**: [Link to PagerDuty]
- **Slack Channels**:
  - #incidents
  - #engineering
  - #devops
  - #monitoring

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
**Owner**: DevOps Team
