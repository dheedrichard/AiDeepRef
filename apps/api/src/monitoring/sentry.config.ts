import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export interface SentryConfigOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  enableProfiling?: boolean;
}

export function createSentryConfig(options: SentryConfigOptions): Sentry.NodeOptions {
  const {
    dsn,
    environment,
    release,
    tracesSampleRate = 0.2,
    profilesSampleRate = 0.05,
    enableProfiling = true,
  } = options;

  const integrations: Sentry.Integration[] = [
    // HTTP instrumentation
    Sentry.httpIntegration(),

    // Express instrumentation (for NestJS)
    Sentry.expressIntegration(),

    // Node.js built-ins instrumentation
    Sentry.nativeNodeFetchIntegration(),

    // PostgreSQL instrumentation (if using pg)
    Sentry.postgresIntegration(),
  ];

  // Add profiling integration if enabled
  if (enableProfiling && profilesSampleRate > 0) {
    integrations.push(nodeProfilingIntegration());
  }

  return {
    dsn,
    environment,
    release,

    // Performance Monitoring
    tracesSampleRate,
    profilesSampleRate,

    // Integrations
    integrations,

    // Error Sampling
    sampleRate: 1.0, // Capture 100% of errors

    // Breadcrumbs
    maxBreadcrumbs: 50,

    // Context
    attachStacktrace: true,

    // Privacy - Data Scrubbing
    beforeSend(event, hint) {
      // Filter sensitive data from error events
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-csrf-token'];
        }

        // Remove sensitive query parameters
        if (event.request.query_string) {
          const sensitiveParams = ['token', 'api_key', 'password', 'secret'];
          let queryString = event.request.query_string;
          sensitiveParams.forEach(param => {
            queryString = queryString.replace(
              new RegExp(`${param}=[^&]*`, 'gi'),
              `${param}=[FILTERED]`
            );
          });
          event.request.query_string = queryString;
        }
      }

      // Remove sensitive data from extra context
      if (event.extra) {
        const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];
        Object.keys(event.extra).forEach(key => {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            event.extra![key] = '[FILTERED]';
          }
        });
      }

      return event;
    },

    // Transaction filtering
    beforeSendTransaction(event) {
      // Filter out health check endpoints from transactions
      if (event.transaction?.includes('/health') || event.transaction?.includes('/metrics')) {
        return null;
      }
      return event;
    },

    // Performance monitoring options
    tracesSampler(samplingContext) {
      // Custom sampling logic
      const transactionName = samplingContext.transactionContext.name;

      // Always sample errors
      if (samplingContext.parentSampled === true) {
        return 1.0;
      }

      // Higher sampling for critical endpoints
      if (transactionName?.includes('/ai/') || transactionName?.includes('/references/')) {
        return 0.5; // 50% sampling for AI and reference endpoints
      }

      // Lower sampling for health checks and static assets
      if (transactionName?.includes('/health') || transactionName?.includes('/static')) {
        return 0; // Don't sample
      }

      // Default sampling rate
      return tracesSampleRate;
    },

    // Alert Configuration (metadata for documentation)
    _metadata: {
      alertRules: {
        errorRateSpike: {
          condition: 'error rate > 10 errors/min',
          threshold: 10,
          window: '1m',
          severity: 'critical',
        },
        slowApiResponses: {
          condition: 'p95 latency > 2s',
          threshold: 2000,
          window: '5m',
          severity: 'warning',
        },
        databaseConnectionFailure: {
          condition: 'database connection errors',
          threshold: 1,
          window: '1m',
          severity: 'critical',
        },
        aiApiFailure: {
          condition: 'AI API errors',
          threshold: 5,
          window: '5m',
          severity: 'high',
        },
        memoryUsage: {
          condition: 'memory usage > 80%',
          threshold: 0.8,
          window: '5m',
          severity: 'warning',
        },
      },
    },
  };
}

// Performance budgets for monitoring
export const PERFORMANCE_BUDGETS = {
  api: {
    p95Latency: 500, // ms
    p99Latency: 1000, // ms
    errorRate: 0.01, // 1%
  },
  database: {
    queryTime: 200, // ms
    connectionPoolUsage: 0.8, // 80%
  },
  ai: {
    responseTime: 5000, // ms
    errorRate: 0.05, // 5%
  },
  cache: {
    hitRate: 0.8, // 80%
  },
};

// Custom metrics names
export const SENTRY_METRICS = {
  API_LATENCY: 'api.latency',
  API_REQUESTS: 'api.requests',
  API_ERRORS: 'api.errors',
  DB_QUERY_TIME: 'db.query_time',
  DB_CONNECTION_POOL: 'db.connection_pool_usage',
  AI_RESPONSE_TIME: 'ai.response_time',
  AI_TOKENS_USED: 'ai.tokens_used',
  CACHE_HIT_RATE: 'cache.hit_rate',
  CACHE_MISS_RATE: 'cache.miss_rate',
};
