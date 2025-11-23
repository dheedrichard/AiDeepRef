# Monitoring & Observability Strategy - AiDeepRef

**Version:** 1.0
**Last Updated:** 2025-11-23
**Status:** PRODUCTION READY
**Cloud Provider:** Microsoft Azure

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack Architecture](#monitoring-stack-architecture)
3. [What to Monitor](#what-to-monitor)
4. [Logging Strategy](#logging-strategy)
5. [Distributed Tracing](#distributed-tracing)
6. [Key Dashboards](#key-dashboards)
7. [Alerting Rules](#alerting-rules)
8. [Implementation Guide](#implementation-guide)
9. [Cost Optimization](#cost-optimization)
10. [Runbooks](#runbooks)

---

## Overview

### Monitoring Philosophy

AiDeepRef's monitoring strategy is built on three core pillars:

1. **Proactive Detection**: Identify issues before users experience them
2. **Rapid Response**: Enable quick diagnosis and resolution
3. **Continuous Improvement**: Use data to drive optimization decisions

### Architecture Principles

- **Observability-First**: All components instrumented by default
- **Correlation**: Every log, metric, and trace tied to user sessions
- **Cost-Aware**: Monitor costs as aggressively as performance
- **Security-Focused**: Track security events and anomalies
- **SLO-Driven**: Alerts based on Service Level Objectives

---

## Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web App    │  │   API App    │  │  Background  │         │
│  │  (Angular)   │  │  (NestJS)    │  │    Jobs      │         │
│  └──────┬───────┘  │──────┬───────┘  └──────┬───────┘         │
│         │          │      │                  │                  │
│         └──────────┴──────┴──────────────────┘                  │
│                           │                                      │
│              OpenTelemetry SDK (Instrumentation)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Azure Application Insights                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Traces    │  │    Metrics   │  │     Logs     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Azure Log Analytics Workspace                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ KQL Queries  │  │   Storage    │  │  Retention   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   Azure Monitor         │  │  Custom Dashboards       │
│  - Alerts               │  │  - Grafana (Optional)    │
│  - Action Groups        │  │  - Power BI              │
│  - Workbooks            │  │  - Azure Dashboards      │
└─────────────────────────┘  └──────────────────────────┘
```

### Stack Components

#### 1. Azure Application Insights (Primary)
- **Purpose**: Centralized APM and telemetry
- **Features**:
  - Automatic dependency tracking
  - Live metrics stream
  - Failure anomaly detection
  - Smart detection with ML
  - Application map visualization
- **Retention**: 90 days (configurable up to 730 days)
- **Pricing Tier**: Pay-as-you-go with daily cap

#### 2. Azure Monitor
- **Purpose**: Infrastructure and platform monitoring
- **Features**:
  - Metrics collection from AKS, PostgreSQL, Redis
  - Action groups for alerting
  - Diagnostic settings
  - Activity logs
- **Integration**: Native with all Azure resources

#### 3. Log Analytics Workspace
- **Purpose**: Log aggregation and analysis
- **Features**:
  - KQL (Kusto Query Language) for analysis
  - Log retention policies
  - Cross-resource queries
  - Integration with Application Insights
- **Retention**:
  - 30 days (interactive, included)
  - 90 days (total retention, standard)
  - Up to 2 years (archive tier)

#### 4. Prometheus + Grafana (Optional)
- **Purpose**: Enhanced metrics visualization and custom dashboards
- **Use Cases**:
  - Custom business metrics
  - Multi-cloud monitoring
  - OSS tooling preference
- **Deployment**: Containerized in AKS
- **Integration**: Export to Application Insights

#### 5. Sentry (Already Integrated)
- **Purpose**: Error tracking and performance monitoring
- **Features**:
  - Stack traces with source maps
  - Release tracking
  - User feedback integration
- **Usage**: Complement Application Insights for frontend errors

---

## What to Monitor

### 1. Application Metrics

#### API Performance (apps/api)

```typescript
// Key Metrics to Track
{
  // Request Metrics
  "http_request_duration_seconds": {
    "labels": ["method", "route", "status_code"],
    "type": "histogram",
    "buckets": [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
  },
  "http_requests_total": {
    "labels": ["method", "route", "status_code"],
    "type": "counter"
  },
  "http_request_size_bytes": {
    "labels": ["method", "route"],
    "type": "histogram"
  },
  "http_response_size_bytes": {
    "labels": ["method", "route"],
    "type": "histogram"
  },

  // Error Rates
  "http_errors_total": {
    "labels": ["method", "route", "error_type"],
    "type": "counter"
  },
  "unhandled_exceptions_total": {
    "labels": ["exception_type"],
    "type": "counter"
  },

  // API-Specific Metrics
  "reference_requests_total": {
    "labels": ["status", "user_type"],
    "type": "counter"
  },
  "reference_verification_duration_seconds": {
    "labels": ["verification_type"],
    "type": "histogram"
  },
  "id_verification_uploads_total": {
    "labels": ["status", "document_type"],
    "type": "counter"
  }
}
```

**SLO Targets:**
- API Latency (P95): < 500ms
- API Latency (P99): < 1000ms
- Error Rate: < 0.1%
- Availability: 99.9% (43 min downtime/month)

#### Web Application (apps/web)

```typescript
// Frontend Metrics
{
  // Page Load Performance
  "page_load_duration_seconds": {
    "labels": ["page_name"],
    "type": "histogram"
  },
  "first_contentful_paint_seconds": {
    "labels": ["page_name"],
    "type": "histogram"
  },
  "time_to_interactive_seconds": {
    "labels": ["page_name"],
    "type": "histogram"
  },
  "cumulative_layout_shift": {
    "labels": ["page_name"],
    "type": "histogram"
  },

  // User Interactions
  "user_actions_total": {
    "labels": ["action_type", "component"],
    "type": "counter"
  },
  "form_submissions_total": {
    "labels": ["form_name", "status"],
    "type": "counter"
  },
  "form_validation_errors_total": {
    "labels": ["form_name", "field"],
    "type": "counter"
  },

  // Client-Side Errors
  "javascript_errors_total": {
    "labels": ["error_type", "page"],
    "type": "counter"
  },
  "api_call_errors_total": {
    "labels": ["endpoint", "status_code"],
    "type": "counter"
  }
}
```

**SLO Targets:**
- Page Load (P95): < 2s
- First Contentful Paint: < 1s
- Time to Interactive: < 3s
- JavaScript Error Rate: < 0.5%

### 2. Infrastructure Metrics

#### Azure Kubernetes Service (AKS)

```yaml
# Node-Level Metrics
Node Metrics:
  - node_cpu_usage_percentage
  - node_memory_usage_percentage
  - node_disk_usage_percentage
  - node_network_bytes_transmitted
  - node_network_bytes_received
  - node_pod_count

# Pod-Level Metrics
Pod Metrics:
  - pod_cpu_usage_percentage
  - pod_memory_usage_bytes
  - pod_memory_limit_bytes
  - pod_restart_count
  - pod_status (Running/Failed/Pending)
  - container_cpu_throttling_seconds_total

# Cluster-Level Metrics
Cluster Metrics:
  - cluster_autoscaler_events
  - horizontal_pod_autoscaler_events
  - pending_pods_count
  - failed_pods_count
  - cluster_cpu_allocation_percentage
  - cluster_memory_allocation_percentage
```

**SLO Targets:**
- Node CPU Usage: < 70% average
- Node Memory Usage: < 80% average
- Pod Restart Rate: < 5 per hour
- Cluster Health: 100%

#### PostgreSQL Database

```yaml
Database Metrics:
  - pg_stat_database_numbackends        # Active connections
  - pg_stat_database_xact_commit        # Transaction commits
  - pg_stat_database_xact_rollback      # Transaction rollbacks
  - pg_stat_database_blks_read          # Disk block reads
  - pg_stat_database_blks_hit           # Cache hits
  - pg_stat_database_tup_returned       # Rows returned
  - pg_stat_database_tup_fetched        # Rows fetched
  - pg_stat_database_tup_inserted       # Rows inserted
  - pg_stat_database_tup_updated        # Rows updated
  - pg_stat_database_tup_deleted        # Rows deleted
  - pg_stat_database_deadlocks          # Deadlock count
  - pg_database_size_bytes              # Database size
  - pg_slow_queries_total               # Queries > 1s

# Connection Pool Metrics
Connection Pool:
  - pool_active_connections
  - pool_idle_connections
  - pool_waiting_connections
  - pool_connection_errors_total
  - pool_connection_timeouts_total
```

**SLO Targets:**
- Query Latency (P95): < 100ms
- Cache Hit Rate: > 95%
- Connection Pool Utilization: < 80%
- Slow Queries (>1s): < 1% of total

#### Redis Cache

```yaml
Redis Metrics:
  - redis_connected_clients
  - redis_blocked_clients
  - redis_used_memory_bytes
  - redis_memory_fragmentation_ratio
  - redis_keyspace_hits_total
  - redis_keyspace_misses_total
  - redis_commands_processed_total
  - redis_commands_duration_seconds
  - redis_evicted_keys_total
  - redis_expired_keys_total
  - redis_db_keys_count
  - redis_replication_lag_seconds
```

**SLO Targets:**
- Cache Hit Rate: > 90%
- Memory Usage: < 80%
- Command Latency (P95): < 10ms
- Eviction Rate: < 100 keys/minute

### 3. Business Metrics

```typescript
// User Activity
{
  "user_signups_total": {
    "labels": ["user_type", "source"],
    "type": "counter"
  },
  "user_logins_total": {
    "labels": ["user_type", "method"],
    "type": "counter"
  },
  "user_active_sessions": {
    "labels": ["user_type"],
    "type": "gauge"
  },
  "user_retention_rate": {
    "labels": ["cohort_week"],
    "type": "gauge"
  },

  // Reference Activity
  "references_created_total": {
    "labels": ["reference_type"],
    "type": "counter"
  },
  "references_sent_total": {
    "labels": ["reference_type", "status"],
    "type": "counter"
  },
  "references_completed_total": {
    "labels": ["reference_type"],
    "type": "counter"
  },
  "reference_completion_duration_seconds": {
    "labels": ["reference_type"],
    "type": "histogram"
  },
  "reference_response_rate": {
    "labels": ["reference_type"],
    "type": "gauge"
  },

  // ID Verification
  "id_verifications_submitted_total": {
    "labels": ["document_type"],
    "type": "counter"
  },
  "id_verifications_approved_total": {
    "labels": ["document_type"],
    "type": "counter"
  },
  "id_verifications_rejected_total": {
    "labels": ["document_type", "rejection_reason"],
    "type": "counter"
  },
  "id_verification_processing_duration_seconds": {
    "type": "histogram"
  },

  // Revenue (if applicable)
  "revenue_total_usd": {
    "labels": ["plan_type"],
    "type": "counter"
  },
  "subscription_conversions_total": {
    "labels": ["from_plan", "to_plan"],
    "type": "counter"
  },
  "subscription_churn_total": {
    "labels": ["plan_type", "reason"],
    "type": "counter"
  }
}
```

**Key Performance Indicators:**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- User Acquisition Cost (UAC)
- Customer Lifetime Value (CLTV)
- Reference Completion Rate
- ID Verification Approval Rate
- Net Promoter Score (NPS)

### 4. AI Metrics (OpenRouter Integration)

```typescript
// AI Model Performance
{
  "ai_requests_total": {
    "labels": ["model", "operation", "status"],
    "type": "counter"
  },
  "ai_request_duration_seconds": {
    "labels": ["model", "operation"],
    "type": "histogram",
    "buckets": [0.5, 1, 2, 5, 10, 20, 30, 60]
  },
  "ai_tokens_used_total": {
    "labels": ["model", "token_type"],
    "type": "counter"
  },
  "ai_cost_usd": {
    "labels": ["model", "operation"],
    "type": "counter"
  },
  "ai_errors_total": {
    "labels": ["model", "error_type"],
    "type": "counter"
  },
  "ai_rate_limit_hits_total": {
    "labels": ["model"],
    "type": "counter"
  },
  "ai_context_size_bytes": {
    "labels": ["operation"],
    "type": "histogram"
  },

  // AI Quality Metrics
  "ai_response_quality_score": {
    "labels": ["model", "operation"],
    "type": "histogram"
  },
  "ai_hallucination_detected_total": {
    "labels": ["model"],
    "type": "counter"
  },
  "ai_moderation_flags_total": {
    "labels": ["flag_type"],
    "type": "counter"
  }
}
```

**SLO Targets:**
- AI Response Time (P95): < 5s
- AI Error Rate: < 1%
- AI Cost per Request: Monitor and optimize
- Rate Limit Hits: 0

**Cost Tracking:**
```typescript
// Daily AI Cost Breakdown
{
  "model": {
    "gpt-4-turbo": "$X.XX",
    "gpt-3.5-turbo": "$X.XX",
    "claude-3-opus": "$X.XX"
  },
  "operation": {
    "reference_context_generation": "$X.XX",
    "reference_analysis": "$X.XX",
    "content_moderation": "$X.XX"
  },
  "total_daily_cost": "$X.XX",
  "budget_remaining": "$X.XX"
}
```

### 5. Security Metrics

```typescript
// Authentication & Authorization
{
  "auth_login_attempts_total": {
    "labels": ["status", "method"],
    "type": "counter"
  },
  "auth_failed_login_attempts_total": {
    "labels": ["reason", "ip_address"],
    "type": "counter"
  },
  "auth_password_reset_requests_total": {
    "type": "counter"
  },
  "auth_mfa_challenges_total": {
    "labels": ["status"],
    "type": "counter"
  },
  "auth_token_refresh_total": {
    "labels": ["status"],
    "type": "counter"
  },
  "auth_suspicious_activity_total": {
    "labels": ["activity_type"],
    "type": "counter"
  },

  // Access Control
  "rbac_permission_denied_total": {
    "labels": ["user_role", "resource", "action"],
    "type": "counter"
  },
  "rbac_privilege_escalation_attempts_total": {
    "type": "counter"
  },

  // Security Events
  "security_sql_injection_attempts_total": {
    "type": "counter"
  },
  "security_xss_attempts_total": {
    "type": "counter"
  },
  "security_csrf_violations_total": {
    "type": "counter"
  },
  "security_rate_limit_violations_total": {
    "labels": ["endpoint", "ip_address"],
    "type": "counter"
  },
  "security_data_export_total": {
    "labels": ["user_type", "data_type"],
    "type": "counter"
  },
  "security_pii_access_total": {
    "labels": ["user_role", "pii_type"],
    "type": "counter"
  }
}
```

**Security Alerts:**
- 5+ failed login attempts from same IP in 5 minutes
- Privilege escalation attempts
- Unusual data export volume
- SQL injection/XSS attempts
- Suspicious geographic login patterns

---

## Logging Strategy

### Log Levels

```typescript
enum LogLevel {
  ERROR   = 0,  // System errors, exceptions
  WARN    = 1,  // Warnings, deprecated features
  INFO    = 2,  // Business events, state changes
  DEBUG   = 3,  // Detailed debugging info
  TRACE   = 4   // Very detailed trace info
}
```

**Environment Configuration:**
```yaml
Production:   INFO and above
Staging:      DEBUG and above
Development:  TRACE and above
```

### Structured Logging Format (JSON)

```json
{
  "timestamp": "2025-11-23T14:32:15.234Z",
  "level": "INFO",
  "correlationId": "req-8a3f7d2c-4b1e-9f6a-2d8c-5e7b3a9c1f4d",
  "traceId": "trace-1a2b3c4d5e6f7g8h",
  "spanId": "span-9i8h7g6f5e4d3c2b",
  "service": "api",
  "version": "1.2.3",
  "environment": "production",
  "userId": "user-123456",
  "sessionId": "session-abc123",
  "message": "Reference request created successfully",
  "context": {
    "referenceId": "ref-789",
    "requestType": "employment",
    "requestedBy": "user-123456",
    "referrer": "user-789012"
  },
  "metadata": {
    "duration": 245,
    "statusCode": 201,
    "method": "POST",
    "path": "/api/v1/references",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.100"
  },
  "tags": ["reference", "creation", "business-event"]
}
```

### Log Categories

#### 1. Application Logs

```typescript
// NestJS Logger Configuration
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const logger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.ApplicationInsights({
      instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATION_KEY,
      level: 'info'
    })
  ],
  defaultMeta: {
    service: 'api',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV
  }
});

// Usage Examples
logger.info('User logged in', {
  userId: user.id,
  method: 'email',
  correlationId: req.correlationId
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  correlationId: req.correlationId
});
```

#### 2. Audit Logs

```typescript
// Audit Log Schema
interface AuditLog {
  timestamp: string;
  eventType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ACCESS';
  userId: string;
  userRole: string;
  resource: string;
  resourceId: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE';
  ipAddress: string;
  userAgent: string;
  changes?: {
    before: object;
    after: object;
  };
  reason?: string;
  correlationId: string;
}

// Example Audit Events
const auditEvents = {
  'USER_LOGIN': 'User authentication',
  'USER_LOGOUT': 'User session end',
  'REFERENCE_CREATE': 'Reference request created',
  'REFERENCE_UPDATE': 'Reference request updated',
  'REFERENCE_DELETE': 'Reference request deleted',
  'ID_VERIFICATION_VIEW': 'ID verification document viewed',
  'PII_ACCESS': 'Personal information accessed',
  'SETTINGS_CHANGE': 'System settings modified',
  'ADMIN_ACTION': 'Administrative action performed'
};
```

#### 3. Security Logs

```typescript
// Security Event Logging
interface SecurityLog {
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  eventType: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  description: string;
  metadata: object;
  correlationId: string;
}

// Examples
securityLogger.warn('Multiple failed login attempts', {
  ipAddress: '192.168.1.100',
  attempts: 5,
  timeWindow: '5 minutes'
});

securityLogger.critical('Potential SQL injection attempt', {
  ipAddress: '10.0.0.50',
  endpoint: '/api/users',
  payload: sanitizedPayload
});
```

#### 4. Performance Logs

```typescript
// Slow Query Logging
interface SlowQueryLog {
  timestamp: string;
  queryType: 'database' | 'cache' | 'external-api';
  query: string;
  duration: number;
  threshold: number;
  parameters?: object;
  stackTrace?: string;
  correlationId: string;
}

// Automatic logging for queries > 1s
if (queryDuration > 1000) {
  performanceLogger.warn('Slow database query detected', {
    query: query.sql,
    duration: queryDuration,
    threshold: 1000,
    correlationId: req.correlationId
  });
}
```

### Correlation IDs

```typescript
// Middleware to add correlation ID to all requests
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // Add to logger context
    logger.setDefaultMeta({
      correlationId
    });

    next();
  }
}

// Propagate to child services
axios.get('/api/resource', {
  headers: {
    'x-correlation-id': req.correlationId
  }
});
```

### PII Redaction

```typescript
// PII Redaction Middleware
const piiPatterns = {
  email: /[\w.-]+@[\w.-]+\.\w+/g,
  phone: /\+?1?\d{9,15}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  password: /(password|pwd|pass)[\s:=]+\S+/gi
};

function redactPII(data: any): any {
  if (typeof data === 'string') {
    let redacted = data;
    Object.values(piiPatterns).forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }

  if (typeof data === 'object') {
    const redacted = { ...data };
    for (const key in redacted) {
      if (sensitiveFields.includes(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactPII(redacted[key]);
      }
    }
    return redacted;
  }

  return data;
}

// Apply to all logs
logger.format = winston.format.combine(
  winston.format.json(),
  winston.format((info) => {
    return {
      ...info,
      message: redactPII(info.message),
      context: redactPII(info.context)
    };
  })()
);
```

### Log Retention Policy

```yaml
Log Retention:
  Application Logs:
    Hot (Interactive): 30 days
    Warm (Basic): 90 days
    Cold (Archive): 365 days

  Audit Logs:
    Hot: 90 days
    Warm: 365 days
    Cold: 7 years (compliance)

  Security Logs:
    Hot: 90 days
    Warm: 365 days
    Cold: 3 years

  Debug Logs:
    Hot: 7 days
    Warm: 30 days
    No Archive: Auto-delete after 30 days
```

---

## Distributed Tracing

### OpenTelemetry Integration

#### 1. Setup OpenTelemetry SDK

```typescript
// apps/api/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new AzureMonitorTraceExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'deepref-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV
  }),
  traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new NestInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: true
    }),
    new RedisInstrumentation()
  ]
});

sdk.start();
```

#### 2. Custom Spans

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Service class with custom tracing
@Injectable()
export class ReferenceService {
  private tracer = trace.getTracer('reference-service', '1.0.0');

  async createReference(dto: CreateReferenceDto): Promise<Reference> {
    // Create parent span
    return this.tracer.startActiveSpan('createReference', async (span) => {
      try {
        span.setAttributes({
          'reference.type': dto.type,
          'reference.requestedBy': dto.userId,
          'operation': 'create'
        });

        // Validate input
        const validationSpan = this.tracer.startSpan('validateInput', {
          parent: span
        });
        await this.validateDto(dto);
        validationSpan.end();

        // Generate AI context
        const aiSpan = this.tracer.startSpan('generateAIContext', {
          parent: span
        });
        const aiContext = await this.aiService.generateContext(dto);
        aiSpan.setAttributes({
          'ai.model': 'gpt-4-turbo',
          'ai.tokens': aiContext.tokensUsed,
          'ai.cost': aiContext.cost
        });
        aiSpan.end();

        // Save to database
        const dbSpan = this.tracer.startSpan('saveToDatabase', {
          parent: span
        });
        const reference = await this.referenceRepo.save({
          ...dto,
          aiContext
        });
        dbSpan.end();

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttributes({
          'reference.id': reference.id,
          'operation.success': true
        });

        return reference;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

#### 3. Frontend Tracing

```typescript
// apps/web/src/app/core/tracing/tracing.service.ts
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

@Injectable({ providedIn: 'root' })
export class TracingService {
  private appInsights: ApplicationInsights;

  constructor() {
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: environment.appInsightsConnectionString,
        enableAutoRouteTracking: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        enableAjaxPerfTracking: true,
        enableCorsCorrelation: true,
        correlationHeaderExcludedDomains: ['*.queue.core.windows.net']
      }
    });
    this.appInsights.loadAppInsights();
  }

  trackPageView(name: string, properties?: object) {
    this.appInsights.trackPageView({ name, properties });
  }

  trackEvent(name: string, properties?: object, metrics?: object) {
    this.appInsights.trackEvent({ name }, properties, metrics);
  }

  trackException(error: Error, severityLevel?: number) {
    this.appInsights.trackException({
      exception: error,
      severityLevel
    });
  }

  startTrackEvent(name: string) {
    this.appInsights.startTrackEvent(name);
  }

  stopTrackEvent(name: string, properties?: object, metrics?: object) {
    this.appInsights.stopTrackEvent(name, properties, metrics);
  }
}
```

#### 4. Trace Context Propagation

```typescript
// HTTP Client Interceptor
@Injectable()
export class TracingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const tracingService = inject(TracingService);
    const correlationId = tracingService.getOperationId();

    // Add trace headers
    const tracedReq = req.clone({
      setHeaders: {
        'x-correlation-id': correlationId,
        'traceparent': tracingService.getTraceparent(),
        'tracestate': tracingService.getTracestate()
      }
    });

    return next.handle(tracedReq);
  }
}
```

### Trace Visualization

```
Example Distributed Trace:

┌─────────────────────────────────────────────────────────────────┐
│ HTTP POST /api/v1/references (1234ms)                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ validateInput (45ms)                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ generateAIContext (890ms)                                   │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ OpenRouter API Call (875ms)                             │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ saveToDatabase (234ms)                                      │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ PostgreSQL INSERT (198ms)                               │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Redis Cache Update (28ms)                               │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ sendNotification (65ms)                                     │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Email Service (62ms)                                    │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Dashboards

### Dashboard 1: Operations Dashboard

**Purpose**: Real-time system health and performance monitoring

**Panels:**

1. **System Health Overview**
   - Service status (Green/Yellow/Red)
   - Overall error rate (%)
   - Request throughput (req/s)
   - Average response time (ms)

2. **API Performance**
   - Request duration (P50, P95, P99)
   - Requests per second by endpoint
   - Error rate by endpoint (%)
   - Top 10 slowest endpoints

3. **Infrastructure Health**
   - AKS cluster CPU/Memory usage
   - Node count and status
   - Pod restart count
   - Container resource utilization

4. **Database Performance**
   - PostgreSQL connection count
   - Query latency (P95)
   - Cache hit rate (%)
   - Slow queries (>1s) count

5. **Cache Performance**
   - Redis memory usage
   - Cache hit/miss rate
   - Commands per second
   - Eviction rate

6. **Background Jobs**
   - Queue depth by job type
   - Job processing rate
   - Failed job count
   - Job duration by type

**KQL Query Examples:**

```kusto
// API Request Duration P95
requests
| where timestamp > ago(1h)
| summarize percentile(duration, 95) by bin(timestamp, 1m), name
| render timechart

// Error Rate by Endpoint
requests
| where timestamp > ago(1h)
| summarize
    totalRequests = count(),
    failedRequests = countif(success == false)
    by name
| extend errorRate = (failedRequests * 100.0) / totalRequests
| project name, errorRate
| order by errorRate desc

// Top Resource Consumers (Pods)
KubePodInventory
| where TimeGenerated > ago(1h)
| extend cpuUsage = todouble(ContainerCpuUsageNanoCores) / 1000000000
| summarize
    avgCpu = avg(cpuUsage),
    maxCpu = max(cpuUsage)
    by PodName
| order by avgCpu desc
| take 10
```

### Dashboard 2: Business Metrics Dashboard

**Purpose**: Track key business KPIs and user engagement

**Panels:**

1. **User Metrics**
   - Daily/Weekly/Monthly Active Users
   - New user signups (daily trend)
   - User retention by cohort
   - Active sessions by user type

2. **Reference Activity**
   - References created (daily/weekly)
   - Reference completion rate (%)
   - Average time to complete reference
   - References by type breakdown

3. **ID Verification**
   - Verification submissions (daily)
   - Approval rate (%)
   - Average processing time
   - Rejection reasons breakdown

4. **Conversion Funnel**
   - Signup → Email Verification rate
   - Email Verified → Profile Complete rate
   - Profile Complete → First Reference rate
   - Reference Sent → Reference Completed rate

5. **Revenue Metrics** (if applicable)
   - Monthly Recurring Revenue (MRR)
   - New vs churned subscriptions
   - Average Revenue Per User (ARPU)
   - Conversion rate by plan type

6. **User Engagement**
   - Average session duration
   - Pages per session
   - Feature usage breakdown
   - User feedback scores

**KQL Query Examples:**

```kusto
// Daily Active Users
customEvents
| where timestamp > ago(30d)
| where name == "UserActivity"
| summarize dau = dcount(user_Id) by bin(timestamp, 1d)
| render timechart

// Reference Completion Funnel
let timeRange = ago(7d);
let created = customEvents
    | where timestamp > timeRange
    | where name == "ReferenceCreated"
    | count;
let sent = customEvents
    | where timestamp > timeRange
    | where name == "ReferenceSent"
    | count;
let completed = customEvents
    | where timestamp > timeRange
    | where name == "ReferenceCompleted"
    | count;
print
    step1 = created,
    step2 = sent,
    step3 = completed,
    conversionRate = (completed * 100.0) / created

// User Retention by Cohort
customEvents
| where name == "UserLogin"
| extend cohortWeek = startofweek(user_AuthenticatedId)
| summarize
    cohortSize = dcount(user_Id),
    activeUsers = dcount(user_Id)
    by cohortWeek, weekNumber = datetime_diff('week', timestamp, cohortWeek)
| extend retentionRate = (activeUsers * 100.0) / cohortSize
| project cohortWeek, weekNumber, retentionRate
```

### Dashboard 3: Security Dashboard

**Purpose**: Monitor security events and potential threats

**Panels:**

1. **Authentication Activity**
   - Login attempts (success/failure)
   - Failed login attempts by IP
   - MFA challenge success rate
   - Password reset requests

2. **Suspicious Activity**
   - Brute force attack attempts
   - Unusual geographic logins
   - Multiple sessions from different locations
   - Privilege escalation attempts

3. **Access Control**
   - Permission denied events
   - Admin actions log
   - PII access audit trail
   - Data export activity

4. **Vulnerability Detection**
   - SQL injection attempts
   - XSS attempts
   - CSRF violations
   - Malicious payload detection

5. **Rate Limiting**
   - Rate limit violations by endpoint
   - Top offending IPs
   - Blocked requests count
   - DDoS mitigation events

6. **Compliance Monitoring**
   - GDPR data access requests
   - Right to erasure requests
   - Data breach indicators
   - Audit log completeness

**KQL Query Examples:**

```kusto
// Failed Login Attempts by IP
customEvents
| where timestamp > ago(1h)
| where name == "LoginAttempt"
| where customDimensions.success == "false"
| summarize failedAttempts = count() by ipAddress = tostring(customDimensions.ipAddress)
| where failedAttempts > 5
| order by failedAttempts desc

// Privilege Escalation Attempts
customEvents
| where timestamp > ago(24h)
| where name == "PrivilegeEscalationAttempt"
| extend
    userId = tostring(customDimensions.userId),
    targetRole = tostring(customDimensions.targetRole),
    currentRole = tostring(customDimensions.currentRole)
| project timestamp, userId, currentRole, targetRole, ipAddress
| order by timestamp desc

// Unusual Geographic Login Detection
let normalLocations = customEvents
    | where timestamp between(ago(30d) .. ago(1d))
    | where name == "UserLogin"
    | summarize by userId = user_Id, location = tostring(customDimensions.location);
customEvents
| where timestamp > ago(1d)
| where name == "UserLogin"
| extend location = tostring(customDimensions.location)
| join kind=leftanti normalLocations on userId, location
| project timestamp, userId, location, ipAddress
```

### Dashboard 4: AI & Cost Optimization Dashboard

**Purpose**: Monitor AI usage, costs, and optimization opportunities

**Panels:**

1. **AI Usage Metrics**
   - API calls by model
   - Total tokens consumed (input/output)
   - Average response time by model
   - Error rate by model

2. **Cost Analysis**
   - Daily AI costs by model
   - Cost per operation type
   - Cost trend (7d, 30d)
   - Budget utilization (%)

3. **Performance Optimization**
   - Cache hit rate for AI requests
   - Redundant API calls detected
   - Context size distribution
   - Prompt optimization opportunities

4. **Infrastructure Costs**
   - AKS cluster costs
   - Database costs (compute + storage)
   - Redis cache costs
   - Network egress costs

5. **Resource Optimization**
   - Underutilized pods
   - Oversized resources
   - Rightsizing recommendations
   - Reserved capacity utilization

6. **Cost Forecasting**
   - 30-day cost projection
   - Cost anomaly detection
   - Budget alerts
   - Cost allocation by feature

**KQL Query Examples:**

```kusto
// Daily AI Cost by Model
customMetrics
| where timestamp > ago(30d)
| where name == "ai_cost_usd"
| extend model = tostring(customDimensions.model)
| summarize totalCost = sum(value) by bin(timestamp, 1d), model
| render timechart

// AI Cache Hit Rate
let totalRequests = customMetrics
    | where timestamp > ago(1h)
    | where name == "ai_requests_total"
    | summarize total = sum(value);
let cacheHits = customMetrics
    | where timestamp > ago(1h)
    | where name == "ai_cache_hits_total"
    | summarize hits = sum(value);
print cacheHitRate = (toscalar(cacheHits) * 100.0) / toscalar(totalRequests)

// Resource Rightsizing Opportunities
KubePodInventory
| where TimeGenerated > ago(7d)
| extend
    cpuUsage = todouble(ContainerCpuUsageNanoCores) / todouble(ContainerCpuLimitNanoCores),
    memUsage = todouble(ContainerMemoryWorkingSetBytes) / todouble(ContainerMemoryLimitBytes)
| summarize
    avgCpuUsage = avg(cpuUsage),
    avgMemUsage = avg(memUsage)
    by PodName, ContainerName
| where avgCpuUsage < 0.3 or avgMemUsage < 0.3
| project PodName, ContainerName, avgCpuUsage, avgMemUsage
```

### Dashboard 5: Incident Response Dashboard

**Purpose**: Rapid incident detection and diagnosis

**Panels:**

1. **Current Incidents**
   - Active alerts (critical/warning)
   - Incident timeline
   - Affected services
   - On-call engineer assignment

2. **Error Analysis**
   - Error spike detection
   - Error messages frequency
   - Affected users count
   - Error correlation with deployments

3. **Performance Degradation**
   - Latency anomalies
   - Throughput drop detection
   - Resource saturation alerts
   - Dependency failures

4. **Quick Diagnostics**
   - Recent deployments
   - Configuration changes
   - Infrastructure events
   - External service status

5. **Impact Assessment**
   - Affected user percentage
   - Revenue impact estimate
   - SLO breach status
   - Customer complaints correlation

6. **Remediation Actions**
   - Runbook links
   - Rollback status
   - Mitigation progress
   - Post-mortem checklist

**KQL Query Examples:**

```kusto
// Error Spike Detection
requests
| where timestamp > ago(1h)
| summarize
    errorCount = countif(success == false),
    totalCount = count()
    by bin(timestamp, 1m)
| extend errorRate = (errorCount * 100.0) / totalCount
| extend baseline = series_decompose_anomalies(errorRate, 1.5, -1, 'linefit')
| where baseline > 0  // Anomaly detected
| project timestamp, errorRate, anomalyScore = baseline

// Deployment Correlation
let deploymentTime = ago(30m);
requests
| where timestamp > deploymentTime
| summarize
    errorRate = (countif(success == false) * 100.0) / count(),
    avgDuration = avg(duration)
    by bin(timestamp, 1m)
| extend timeSinceDeployment = datetime_diff('minute', timestamp, deploymentTime)
| render timechart

// Affected Users Count
requests
| where timestamp > ago(1h)
| where success == false
| summarize affectedUsers = dcount(user_Id)
| extend totalUsers = toscalar(
    requests
    | where timestamp > ago(1h)
    | summarize dcount(user_Id)
)
| extend impactPercentage = (affectedUsers * 100.0) / totalUsers
```

---

## Alerting Rules

### Alert Severity Levels

```yaml
Critical (P0):
  Response Time: Immediate (5 minutes)
  Notification: PagerDuty + SMS + Phone Call
  Escalation: After 15 minutes
  Examples:
    - Service completely down
    - Data breach detected
    - Payment processing failure

Warning (P1):
  Response Time: 30 minutes
  Notification: Slack + Email
  Escalation: After 1 hour
  Examples:
    - High error rate (>1%)
    - Latency degradation (>2x baseline)
    - Cache failures

Info (P2):
  Response Time: Next business day
  Notification: Email + Ticket
  Escalation: None
  Examples:
    - Resource utilization trending up
    - Minor performance degradation
    - Non-critical feature failures
```

### Critical Alerts (Page On-Call)

#### 1. Service Availability

```kusto
// Alert: API Service Down
requests
| where timestamp > ago(5m)
| summarize requestCount = count()
| where requestCount == 0

Alert Configuration:
  Name: "API Service Down"
  Severity: Critical (P0)
  Threshold: 0 requests in 5 minutes
  Action Group: On-Call PagerDuty
  Auto-Resolve: Yes
  Cooldown: 10 minutes
```

```kusto
// Alert: High Error Rate
requests
| where timestamp > ago(5m)
| summarize
    errorRate = (countif(success == false) * 100.0) / count()
| where errorRate > 5.0

Alert Configuration:
  Name: "Critical Error Rate"
  Severity: Critical (P0)
  Threshold: >5% errors in 5 minutes
  Action Group: On-Call PagerDuty
  Auto-Resolve: Yes
  Cooldown: 15 minutes
```

#### 2. Database Issues

```kusto
// Alert: Database Connection Pool Exhausted
customMetrics
| where timestamp > ago(5m)
| where name == "pool_active_connections"
| summarize avgConnections = avg(value)
| extend maxConnections = 100
| where avgConnections > (maxConnections * 0.95)

Alert Configuration:
  Name: "Database Connection Pool Exhausted"
  Severity: Critical (P0)
  Threshold: >95% pool utilization
  Action Group: On-Call PagerDuty + Database Team
```

```kusto
// Alert: Database Query Failures
customMetrics
| where timestamp > ago(5m)
| where name == "database_errors_total"
| summarize errorCount = sum(value)
| where errorCount > 10

Alert Configuration:
  Name: "Database Query Failures"
  Severity: Critical (P0)
  Threshold: >10 errors in 5 minutes
  Action Group: On-Call PagerDuty
```

#### 3. Security Incidents

```kusto
// Alert: Brute Force Attack Detected
customEvents
| where timestamp > ago(5m)
| where name == "LoginAttempt"
| where customDimensions.success == "false"
| summarize failedAttempts = count() by ipAddress = tostring(customDimensions.ipAddress)
| where failedAttempts > 10

Alert Configuration:
  Name: "Brute Force Attack Detected"
  Severity: Critical (P0)
  Threshold: >10 failed logins from same IP in 5 minutes
  Action Group: Security Team + On-Call
  Additional Action: Auto-block IP
```

```kusto
// Alert: SQL Injection Attempt
customEvents
| where timestamp > ago(1m)
| where name == "SQLInjectionAttempt"
| summarize attemptCount = count()
| where attemptCount > 0

Alert Configuration:
  Name: "SQL Injection Attempt Detected"
  Severity: Critical (P0)
  Threshold: Any attempt
  Action Group: Security Team + On-Call
```

### Warning Alerts (Email/Slack)

#### 4. Performance Degradation

```kusto
// Alert: High API Latency
requests
| where timestamp > ago(10m)
| summarize p95 = percentile(duration, 95)
| where p95 > 1000

Alert Configuration:
  Name: "High API Latency"
  Severity: Warning (P1)
  Threshold: P95 > 1000ms for 10 minutes
  Action Group: Engineering Slack Channel
  Auto-Resolve: Yes
```

```kusto
// Alert: Cache Hit Rate Low
customMetrics
| where timestamp > ago(15m)
| where name == "redis_keyspace_hits_total" or name == "redis_keyspace_misses_total"
| summarize
    hits = sumif(value, name == "redis_keyspace_hits_total"),
    misses = sumif(value, name == "redis_keyspace_misses_total")
| extend hitRate = (hits * 100.0) / (hits + misses)
| where hitRate < 70.0

Alert Configuration:
  Name: "Low Cache Hit Rate"
  Severity: Warning (P1)
  Threshold: <70% hit rate for 15 minutes
  Action Group: Engineering Email + Slack
```

#### 5. Resource Utilization

```kusto
// Alert: High Pod Memory Usage
KubePodInventory
| where TimeGenerated > ago(10m)
| extend memUsage = (todouble(ContainerMemoryWorkingSetBytes) / todouble(ContainerMemoryLimitBytes)) * 100
| summarize avgMemUsage = avg(memUsage) by PodName
| where avgMemUsage > 85

Alert Configuration:
  Name: "High Pod Memory Usage"
  Severity: Warning (P1)
  Threshold: >85% memory for 10 minutes
  Action Group: DevOps Slack Channel
  Runbook: Scale up pod or investigate memory leak
```

```kusto
// Alert: Disk Space Low
KubeNodeInventory
| where TimeGenerated > ago(5m)
| extend diskUsage = (todouble(DiskUsedBytes) / todouble(DiskCapacityBytes)) * 100
| summarize avgDiskUsage = avg(diskUsage) by Computer
| where avgDiskUsage > 80

Alert Configuration:
  Name: "Node Disk Space Low"
  Severity: Warning (P1)
  Threshold: >80% disk usage
  Action Group: DevOps Email + Slack
  Runbook: Clean up logs or expand disk
```

#### 6. AI Service Issues

```kusto
// Alert: High AI Error Rate
customMetrics
| where timestamp > ago(10m)
| where name == "ai_errors_total"
| summarize
    errors = sum(value)
| extend totalRequests = toscalar(
    customMetrics
    | where timestamp > ago(10m)
    | where name == "ai_requests_total"
    | summarize sum(value)
)
| extend errorRate = (errors * 100.0) / totalRequests
| where errorRate > 2.0

Alert Configuration:
  Name: "High AI Error Rate"
  Severity: Warning (P1)
  Threshold: >2% AI errors
  Action Group: AI Team Email + Slack
```

```kusto
// Alert: AI Cost Budget Exceeded
customMetrics
| where timestamp > ago(1d)
| where name == "ai_cost_usd"
| summarize dailyCost = sum(value)
| extend budgetLimit = 500.0
| where dailyCost > budgetLimit

Alert Configuration:
  Name: "AI Daily Budget Exceeded"
  Severity: Warning (P1)
  Threshold: Daily cost > $500
  Action Group: Finance + Engineering Leads
  Additional Action: Consider rate limiting
```

### SLO-Based Alerts

#### Service Level Objectives

```yaml
SLO Definitions:
  API Availability:
    Target: 99.9% (43.2 min downtime/month)
    Measurement Window: 30 days
    Error Budget: 0.1% (43.2 minutes)

  API Latency:
    Target: P95 < 500ms
    Measurement Window: 1 hour
    Error Budget: 5% of requests

  Reference Completion:
    Target: 95% within 24 hours
    Measurement Window: 7 days
    Error Budget: 5% of references
```

#### SLO Alert Queries

```kusto
// Alert: API Availability SLO Breach
let errorBudget = 0.001;  // 0.1%
let window = 30d;
requests
| where timestamp > ago(window)
| summarize
    totalRequests = count(),
    failedRequests = countif(success == false)
| extend availability = 1.0 - (todouble(failedRequests) / todouble(totalRequests))
| extend target = 0.999
| where availability < target

Alert Configuration:
  Name: "API Availability SLO Breach"
  Severity: Critical (P0)
  Threshold: Availability < 99.9% over 30 days
  Action Group: Engineering Leads + On-Call
  Runbook: Incident response protocol
```

```kusto
// Alert: Error Budget Burn Rate
let errorBudget = 0.001;
let fastBurnWindow = 1h;
let slowBurnWindow = 6h;
// Fast burn (consuming 5% of monthly budget per hour)
let fastBurn = requests
    | where timestamp > ago(fastBurnWindow)
    | summarize errorRate = (countif(success == false) * 1.0) / count()
    | extend budgetBurnRate = errorRate / errorBudget
    | where budgetBurnRate > 0.05;
// Slow burn (consuming 1% of monthly budget per hour)
let slowBurn = requests
    | where timestamp > ago(slowBurnWindow)
    | summarize errorRate = (countif(success == false) * 1.0) / count()
    | extend budgetBurnRate = errorRate / errorBudget
    | where budgetBurnRate > 0.01;
union fastBurn, slowBurn

Alert Configuration:
  Name: "Error Budget Burn Rate High"
  Severity: Warning (P1)
  Conditions:
    - Fast burn: >5% budget/hour
    - Slow burn: >1% budget/hour
  Action Group: Engineering Slack + Email
```

### Alert Action Groups

```yaml
On-Call PagerDuty:
  Type: Webhook
  Endpoint: https://events.pagerduty.com/v2/enqueue
  Recipients:
    - Current on-call engineer
  Escalation Policy:
    - 0 min: Primary on-call
    - 15 min: Secondary on-call
    - 30 min: Engineering manager

Engineering Slack:
  Type: Slack Webhook
  Channel: #alerts-engineering
  Message Format: |
    🚨 Alert: {AlertName}
    Severity: {Severity}
    Description: {Description}
    Query Link: {QueryLink}
    Runbook: {RunbookLink}

Security Team:
  Type: Email + Slack
  Email: security-team@deepref.com
  Slack: #alerts-security
  CC: CISO, VP Engineering

DevOps Email:
  Type: Email
  Recipients:
    - devops-team@deepref.com
  Format: HTML with charts
```

---

## Implementation Guide

### 1. Azure Application Insights Setup

#### Terraform Configuration

```hcl
# infrastructure/terraform/monitoring.tf

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "deepref-logs-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "deepref-appinsights-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  retention_in_days   = 90
  daily_data_cap_in_gb = 10
  daily_data_cap_notifications_disabled = false

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Diagnostic Settings for AKS
resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "aks-diagnostics"
  target_resource_id         = azurerm_kubernetes_cluster.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "kube-apiserver"
  }

  enabled_log {
    category = "kube-controller-manager"
  }

  enabled_log {
    category = "kube-scheduler"
  }

  enabled_log {
    category = "cluster-autoscaler"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Diagnostic Settings for PostgreSQL
resource "azurerm_monitor_diagnostic_setting" "postgres" {
  name                       = "postgres-diagnostics"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Diagnostic Settings for Redis
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "redis-diagnostics"
  target_resource_id         = azurerm_redis_cache.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "ConnectedClientList"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Outputs
output "instrumentation_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}

output "connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}
```

### 2. Application Instrumentation

#### NestJS API Setup

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ApplicationInsightsModule } from '@nestjs/azure-app-insights';
import './tracing';  // Initialize OpenTelemetry

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Application Insights
  app.useLogger(app.get(WinstonModule));

  await app.listen(3000);
}
bootstrap();

// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.ApplicationInsights({
          instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATION_KEY,
          level: 'info'
        })
      ]
    }),
    // ... other modules
  ]
})
export class AppModule {}
```

#### Custom Metrics Service

```typescript
// apps/api/src/common/telemetry/telemetry.service.ts
import { Injectable } from '@nestjs/common';
import { TelemetryClient } from 'applicationinsights';

@Injectable()
export class TelemetryService {
  private client: TelemetryClient;

  constructor() {
    this.client = new TelemetryClient(
      process.env.APPINSIGHTS_INSTRUMENTATION_KEY
    );
    this.client.context.tags[this.client.context.keys.cloudRole] = 'api';
    this.client.context.tags[this.client.context.keys.cloudRoleInstance] =
      process.env.HOSTNAME || 'unknown';
  }

  // Track custom events
  trackEvent(name: string, properties?: object, measurements?: object) {
    this.client.trackEvent({ name, properties, measurements });
  }

  // Track custom metrics
  trackMetric(name: string, value: number, properties?: object) {
    this.client.trackMetric({ name, value, properties });
  }

  // Track dependencies (external API calls)
  trackDependency(
    name: string,
    commandName: string,
    duration: number,
    success: boolean,
    dependencyType: string = 'HTTP'
  ) {
    this.client.trackDependency({
      target: name,
      name: commandName,
      data: commandName,
      duration,
      resultCode: success ? 200 : 500,
      success,
      dependencyTypeName: dependencyType
    });
  }

  // Track exceptions
  trackException(error: Error, properties?: object) {
    this.client.trackException({ exception: error, properties });
  }

  // Business metrics helpers
  trackUserSignup(userType: string, source: string) {
    this.trackEvent('UserSignup', { userType, source });
    this.trackMetric('user_signups_total', 1, { userType, source });
  }

  trackReferenceCreated(referenceType: string, userId: string) {
    this.trackEvent('ReferenceCreated', { referenceType, userId });
    this.trackMetric('references_created_total', 1, { referenceType });
  }

  trackAIRequest(
    model: string,
    operation: string,
    duration: number,
    tokensUsed: number,
    cost: number,
    success: boolean
  ) {
    this.trackDependency(
      'OpenRouter',
      `${operation} - ${model}`,
      duration,
      success,
      'AI'
    );
    this.trackMetric('ai_tokens_used_total', tokensUsed, { model, operation });
    this.trackMetric('ai_cost_usd', cost, { model, operation });
  }
}
```

#### Metrics Decorator

```typescript
// apps/api/src/common/decorators/track-metrics.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const TRACK_METRICS_KEY = 'track_metrics';

export interface MetricsOptions {
  eventName?: string;
  metricName?: string;
  trackDuration?: boolean;
}

export const TrackMetrics = (options: MetricsOptions = {}) =>
  SetMetadata(TRACK_METRICS_KEY, options);

// Interceptor
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly telemetry: TelemetryService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<MetricsOptions>(
      TRACK_METRICS_KEY,
      context.getHandler()
    );

    if (!options) {
      return next.handle();
    }

    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;

          if (options.eventName) {
            this.telemetry.trackEvent(options.eventName, {
              userId: request.user?.id,
              correlationId: request.correlationId
            });
          }

          if (options.trackDuration) {
            this.telemetry.trackMetric(
              `${options.metricName || options.eventName}_duration_ms`,
              duration
            );
          }
        },
        error: (error) => {
          this.telemetry.trackException(error, {
            handler: context.getHandler().name,
            correlationId: request.correlationId
          });
        }
      })
    );
  }
}

// Usage in controller
@Controller('references')
export class ReferenceController {
  @Post()
  @TrackMetrics({
    eventName: 'ReferenceCreated',
    metricName: 'reference_creation',
    trackDuration: true
  })
  async create(@Body() dto: CreateReferenceDto) {
    return this.referenceService.create(dto);
  }
}
```

### 3. Log Query Examples (KQL)

#### Performance Analysis

```kusto
// Top 10 slowest API endpoints
requests
| where timestamp > ago(24h)
| summarize
    count = count(),
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by name
| order by p95 desc
| take 10

// Request duration distribution
requests
| where timestamp > ago(1h)
| summarize count() by bin(duration, 100)
| render barchart

// API calls with slow database queries
requests
| where timestamp > ago(1h)
| join kind=inner (
    dependencies
    | where timestamp > ago(1h)
    | where type == "SQL"
    | where duration > 1000
) on operation_Id
| project
    timestamp,
    request_name = name,
    request_duration = duration,
    db_query = name1,
    db_duration = duration1,
    sql = data
| order by request_duration desc
```

#### Error Analysis

```kusto
// Error rate by endpoint over time
requests
| where timestamp > ago(24h)
| summarize
    totalRequests = count(),
    failedRequests = countif(success == false)
    by bin(timestamp, 1h), name
| extend errorRate = (failedRequests * 100.0) / totalRequests
| render timechart

// Exception details grouped by type
exceptions
| where timestamp > ago(24h)
| extend errorType = tostring(split(type, '.')[array_length(split(type, '.')) - 1])
| summarize
    count = count(),
    affectedUsers = dcount(user_Id),
    sample = any(outerMessage)
    by errorType
| order by count desc

// Correlation between deployments and errors
let deploymentTime = datetime('2025-11-23T10:00:00Z');
requests
| where timestamp between (deploymentTime .. deploymentTime + 2h)
| summarize errorCount = countif(success == false) by bin(timestamp, 5m)
| extend minutesSinceDeployment = datetime_diff('minute', timestamp, deploymentTime)
| render timechart
```

#### User Behavior Analysis

```kusto
// User journey analysis
customEvents
| where timestamp > ago(1d)
| where user_Id != ""
| project timestamp, user_Id, name
| order by user_Id, timestamp asc
| summarize journey = make_list(name) by user_Id
| extend journeyString = strcat_array(journey, " → ")
| summarize count() by journeyString
| order by count_ desc
| take 20

// Session duration distribution
pageViews
| where timestamp > ago(7d)
| summarize
    sessionStart = min(timestamp),
    sessionEnd = max(timestamp),
    pageCount = count()
    by session_Id
| extend sessionDuration = datetime_diff('minute', sessionEnd, sessionStart)
| summarize count() by bin(sessionDuration, 5)
| render columnchart
```

#### Cost Analysis

```kusto
// Daily infrastructure costs
AzureMetrics
| where TimeGenerated > ago(30d)
| where MetricName == "Cost"
| summarize dailyCost = sum(Total) by bin(TimeGenerated, 1d), Resource
| render timechart

// AI cost breakdown by operation
customMetrics
| where timestamp > ago(30d)
| where name == "ai_cost_usd"
| extend
    model = tostring(customDimensions.model),
    operation = tostring(customDimensions.operation)
| summarize totalCost = sum(value) by model, operation
| order by totalCost desc
```

---

## Cost Optimization

### Monitoring Cost Structure

```yaml
Azure Application Insights Pricing (Pay-as-you-go):
  Data Ingestion: $2.76 per GB
  Data Retention:
    - First 90 days: Included
    - Beyond 90 days: $0.12 per GB/month
  Multi-step web tests: $5 per test per month

Log Analytics Workspace:
  Data Ingestion: $2.76 per GB
  Data Retention:
    - First 31 days: Included
    - 31-730 days: $0.12 per GB/month
  Data Archive: $0.025 per GB/month

Estimated Monthly Costs:
  Application Insights: $50-200 (1-5GB/day)
  Log Analytics: $50-150 (1-3GB/day)
  Alert Rules: $0.50 per rule per month
  Total: $100-400/month for production
```

### Cost Optimization Strategies

#### 1. Sampling

```typescript
// Application Insights Sampling Configuration
import { ApplicationInsights } from '@azure/monitor-opentelemetry-exporter';

const config = {
  connectionString: process.env.APPINSIGHTS_CONNECTION_STRING,
  sampling: {
    isEnabled: true,
    maxTelemetryItemsPerSecond: 20,  // Adjust based on traffic
    excludedTypes: 'Exception,Request,Dependency',  // Don't sample critical events
    includedTypes: 'PageView,Event',  // Sample less critical events
  }
};
```

#### 2. Adaptive Sampling Rules

```typescript
// apps/api/src/common/telemetry/sampling.ts
export class AdaptiveSampler {
  private currentRate = 100;  // Start with 100% sampling

  getSamplingPercentage(eventType: string, properties: any): number {
    // Always log errors
    if (eventType === 'exception' || properties.severity === 'error') {
      return 100;
    }

    // Sample based on environment
    if (process.env.NODE_ENV === 'production') {
      // High-value events
      if (eventType === 'userSignup' || eventType === 'referenceCompleted') {
        return 100;
      }

      // Regular page views
      if (eventType === 'pageView') {
        return 10;  // 10% sampling
      }

      // Debug events
      if (properties.logLevel === 'debug') {
        return 1;  // 1% sampling
      }
    }

    return this.currentRate;
  }
}
```

#### 3. Data Volume Management

```kusto
// Monitor daily ingestion
union *
| where TimeGenerated > ago(24h)
| summarize GB = sum(_BilledSize) / 1000000000 by _ResourceId
| order by GB desc

// Set daily cap alert
Alert on: GB > 10 (90% of daily cap)
Action: Notify engineering + increase sampling
```

#### 4. Retention Policies

```hcl
# Tiered retention strategy
resource "azurerm_log_analytics_workspace" "main" {
  retention_in_days = 30  # Interactive tier (included)

  # Archive older data
  data_collection_rule {
    retention_in_days = 90   # Standard retention
    archive_after_days = 30  # Move to archive after 30 days
  }
}
```

### Cost Monitoring Dashboard

```kusto
// Daily monitoring cost
let startDate = ago(30d);
let endDate = now();
Usage
| where TimeGenerated between (startDate .. endDate)
| where IsBillable == true
| summarize
    DataVolume_GB = sum(Quantity) / 1000,
    EstimatedCost_USD = sum(Quantity) / 1000 * 2.76
    by bin(TimeGenerated, 1d), DataType
| render columnchart

// Cost by table/data type
Usage
| where TimeGenerated > ago(7d)
| where IsBillable == true
| summarize
    DataVolume_GB = sum(Quantity) / 1000,
    EstimatedCost_USD = sum(Quantity) / 1000 * 2.76
    by DataType
| order by DataVolume_GB desc
```

---

## Runbooks

### Runbook Template

```markdown
# Runbook: [Alert Name]

## Alert Details
- **Severity**: Critical/Warning/Info
- **Service**: API/Web/Database
- **SLO Impact**: Yes/No

## Symptoms
- What the alert indicates
- Observable user impact
- Related metrics to check

## Investigation Steps
1. Check service health dashboard
2. Review recent deployments
3. Examine error logs
4. Check dependency status

## Resolution Steps
1. Immediate mitigation (if applicable)
2. Root cause investigation
3. Long-term fix
4. Verification steps

## Escalation
- Primary: [Team/Person]
- Secondary: [Team/Person]
- Timeline: [X minutes]

## Post-Incident
- [ ] Create post-mortem
- [ ] Update runbook
- [ ] Improve monitoring/alerting
```

### Example Runbook: High API Latency

```markdown
# Runbook: High API Latency

## Alert Details
- **Severity**: Warning (P1)
- **Service**: API
- **SLO Impact**: Yes - API Latency SLO
- **Trigger**: P95 latency > 1000ms for 10 minutes

## Symptoms
- User complaints about slow page loads
- Increased timeouts
- Database query slowdown
- Cache misses increasing

## Investigation Steps

### 1. Check Application Insights Dashboard
```kusto
// Query recent slow requests
requests
| where timestamp > ago(30m)
| where duration > 1000
| summarize count(), avg(duration), max(duration) by name
| order by avg_duration desc
```

### 2. Check Database Performance
```kusto
// Find slow queries
dependencies
| where timestamp > ago(30m)
| where type == "SQL"
| where duration > 1000
| project timestamp, name, duration, data
| order by duration desc
```

### 3. Check Cache Health
```kusto
// Redis cache hit rate
customMetrics
| where timestamp > ago(30m)
| where name startswith "redis_"
| summarize value = avg(value) by name
```

### 4. Check Infrastructure
- AKS node CPU/memory
- Pod restart count
- Network latency

## Resolution Steps

### Immediate Mitigation
1. **Scale horizontally**: Increase pod replicas
   ```bash
   kubectl scale deployment deepref-api --replicas=5
   ```

2. **Enable aggressive caching**: Increase cache TTL temporarily
   ```typescript
   // Increase cache TTL from 5m to 15m
   @Cacheable({ ttl: 900 })
   ```

3. **Enable request throttling**: Limit concurrent requests
   ```typescript
   @Throttle({ default: { limit: 100, ttl: 60 } })
   ```

### Root Cause Investigation
1. **Database**:
   - Check for missing indexes
   - Review query execution plans
   - Check for table bloat

2. **Application**:
   - Profile slow endpoints
   - Check for N+1 queries
   - Review recent code changes

3. **Infrastructure**:
   - Check node resource constraints
   - Review network latency
   - Verify autoscaling policies

### Long-term Fix
1. Optimize slow queries
2. Add missing database indexes
3. Implement query result caching
4. Add database read replicas
5. Update autoscaling thresholds

## Escalation
- **Primary**: Backend Team Lead
- **Secondary**: Infrastructure Team
- **Timeline**: 30 minutes if no improvement

## Post-Incident
- [ ] Create post-mortem document
- [ ] Update query optimization guide
- [ ] Review and adjust SLO thresholds
- [ ] Add proactive monitoring for similar issues
```

---

## Appendix

### Useful KQL Queries Collection

```kusto
// 1. Request success rate over time
requests
| where timestamp > ago(24h)
| summarize
    total = count(),
    success = countif(success == true)
    by bin(timestamp, 5m)
| extend successRate = (success * 100.0) / total
| render timechart

// 2. Top errors in the last hour
exceptions
| where timestamp > ago(1h)
| summarize count() by problemId, innermostMessage
| order by count_ desc
| take 20

// 3. User activity heatmap
pageViews
| where timestamp > ago(7d)
| extend hour = datetime_part('hour', timestamp)
| extend dayOfWeek = dayofweek(timestamp)
| summarize views = count() by hour, dayOfWeek
| render heatmap

// 4. Dependency call performance
dependencies
| where timestamp > ago(1h)
| summarize
    count = count(),
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95)
    by target, name
| order by p95_duration desc

// 5. Failed authentication attempts
customEvents
| where timestamp > ago(24h)
| where name == "AuthenticationFailed"
| extend reason = tostring(customDimensions.reason)
| summarize count() by reason
| render piechart
```

### Resource Links

- [Azure Monitor Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/)
- [Application Insights Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [KQL Quick Reference](https://docs.microsoft.com/en-us/azure/data-explorer/kql-quick-reference)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [SRE Workbook - Google](https://sre.google/workbook/table-of-contents/)

---

**Document End**

**Next Steps:**
1. Review and approve monitoring strategy
2. Provision Azure resources (Terraform)
3. Implement instrumentation in applications
4. Create dashboards in Application Insights
5. Configure alert rules
6. Set up on-call rotation
7. Conduct monitoring dry-run test
8. Train team on dashboards and runbooks

**Maintained By:** DevOps Team
**Review Cycle:** Quarterly
**Last Review:** 2025-11-23
