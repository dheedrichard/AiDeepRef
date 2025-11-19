import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';

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
  type?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SentryService {
  /**
   * Capture an exception
   */
  captureException(
    error: Error | string,
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      level?: Sentry.SeverityLevel;
    }
  ): string {
    const eventId = Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level || 'error',
    });

    console.error('Exception captured:', error, 'Event ID:', eventId);
    return eventId;
  }

  /**
   * Capture a message
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
      extra: context?.extra,
    });

    console.log('Message captured:', message, 'Event ID:', eventId);
    return eventId;
  }

  /**
   * Set user context
   */
  setUser(user: SentryUser | null): void {
    if (!user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email ? this.maskEmail(user.email) : undefined,
    });

    // Add user role as tag
    if (user.role) {
      this.setTag('user.role', user.role);
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      type: breadcrumb.type || 'default',
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any> | null): void {
    Sentry.setContext(key, context);
  }

  /**
   * Set a tag
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set multiple tags
   */
  setTags(tags: Record<string, string>): void {
    Sentry.setTags(tags);
  }

  /**
   * Start a new transaction
   */
  startTransaction(name: string, op: string): Sentry.Transaction | undefined {
    return Sentry.startTransaction({
      name,
      op,
    });
  }

  /**
   * Start a child span
   */
  startSpan(
    transaction: Sentry.Transaction | Sentry.Span,
    name: string,
    op: string
  ): Sentry.Span | undefined {
    return transaction.startChild({
      op,
      description: name,
    });
  }

  /**
   * Track custom metric
   */
  trackMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    Sentry.metrics.gauge(name, value, {
      unit,
      tags,
    });
  }

  /**
   * Increment counter
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    Sentry.metrics.increment(name, value, {
      tags,
    });
  }

  /**
   * Track distribution metric
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
   * Show feedback dialog
   */
  showReportDialog(eventId?: string): void {
    Sentry.showReportDialog({
      eventId: eventId || Sentry.lastEventId() || '',
      title: 'It looks like we\'re having issues',
      subtitle: 'Our team has been notified',
      subtitle2: 'If you\'d like to help, tell us what happened below',
      labelName: 'Name',
      labelEmail: 'Email',
      labelComments: 'What happened?',
      labelClose: 'Close',
      labelSubmit: 'Submit',
      errorGeneric: 'An unknown error occurred while submitting your report. Please try again.',
      errorFormEntry: 'Some fields were invalid. Please correct the errors and try again.',
      successMessage: 'Your feedback has been sent. Thank you!',
    });
  }

  /**
   * Get last event ID
   */
  getLastEventId(): string | undefined {
    return Sentry.lastEventId();
  }

  /**
   * Flush events
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    return Sentry.flush(timeout);
  }

  /**
   * Close the client
   */
  async close(timeout: number = 2000): Promise<boolean> {
    return Sentry.close(timeout);
  }

  /**
   * Mask email for privacy
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0]}***@${domain}`;
  }
}
