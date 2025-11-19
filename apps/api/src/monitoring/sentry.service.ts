import { Injectable, Logger, Scope } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface SentryBreadcrumb {
  message?: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
  timestamp?: number;
  type?: string;
}

export interface SentryContext {
  [key: string]: any;
}

@Injectable({ scope: Scope.REQUEST })
export class SentryService {
  private readonly logger = new Logger(SentryService.name);

  /**
   * Capture an exception with optional context
   */
  captureException(
    error: Error | string,
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      level?: Sentry.SeverityLevel;
      fingerprint?: string[];
    }
  ): string {
    const eventId = Sentry.captureException(error, {
      tags: context?.tags,
      extra: this.sanitizeContext(context?.extra),
      level: context?.level || 'error',
      fingerprint: context?.fingerprint,
    });

    this.logger.debug(`Exception captured with event ID: ${eventId}`);
    return eventId;
  }

  /**
   * Capture a message with level and context
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    }
  ): string {
    const eventId = Sentry.captureMessage(message, {
      level,
      tags: context?.tags,
      extra: this.sanitizeContext(context?.extra),
    });

    this.logger.debug(`Message captured with event ID: ${eventId}`);
    return eventId;
  }

  /**
   * Set user context for current scope
   * @param user - User information (sanitized, no PII)
   */
  setUser(user: SentryUser | null): void {
    if (!user) {
      Sentry.setUser(null);
      return;
    }

    // Only set non-sensitive user information
    Sentry.setUser({
      id: user.id,
      username: user.username,
      // Use masked email for privacy
      email: user.email ? this.maskEmail(user.email) : undefined,
    });

    // Add user role as tag for filtering
    if (user.role) {
      this.setTag('user.role', user.role);
    }
  }

  /**
   * Add a breadcrumb to track user actions
   */
  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: this.sanitizeContext(breadcrumb.data),
      timestamp: breadcrumb.timestamp || Date.now() / 1000,
      type: breadcrumb.type || 'default',
    });
  }

  /**
   * Set custom context for current scope
   */
  setContext(key: string, context: SentryContext | null): void {
    Sentry.setContext(key, this.sanitizeContext(context));
  }

  /**
   * Set a tag for the current scope
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set multiple tags for the current scope
   */
  setTags(tags: Record<string, string>): void {
    Sentry.setTags(tags);
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(
    name: string,
    op: string,
    description?: string
  ): Sentry.Transaction {
    return Sentry.startTransaction({
      name,
      op,
      description,
    });
  }

  /**
   * Start a child span within current transaction
   */
  startSpan(
    transaction: Sentry.Transaction | Sentry.Span,
    name: string,
    op: string,
    description?: string
  ): Sentry.Span {
    return transaction.startChild({
      op,
      description: description || name,
    });
  }

  /**
   * Track a custom metric
   */
  trackMetric(
    name: string,
    value: number,
    unit?: string,
    tags?: Record<string, string>
  ): void {
    Sentry.metrics.gauge(name, value, {
      unit,
      tags,
    });
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    Sentry.metrics.increment(name, value, {
      tags,
    });
  }

  /**
   * Track a distribution metric (for latency, sizes, etc.)
   */
  trackDistribution(
    name: string,
    value: number,
    unit?: string,
    tags?: Record<string, string>
  ): void {
    Sentry.metrics.distribution(name, value, {
      unit,
      tags,
    });
  }

  /**
   * Flush all pending events (useful for serverless)
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    return Sentry.flush(timeout);
  }

  /**
   * Close the Sentry client
   */
  async close(timeout: number = 2000): Promise<boolean> {
    return Sentry.close(timeout);
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: any): any {
    if (!context) {
      return context;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'api_key',
      'secret',
      'creditCard',
      'credit_card',
      'ssn',
      'authorization',
      'cookie',
      'csrf',
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }

      const sanitized: any = {};
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[FILTERED]';
        } else {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    };

    return sanitize(context);
  }

  /**
   * Mask email for privacy (show only first char and domain)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0]}***@${domain}`;
  }
}
