import { ErrorHandler, Injectable, Injector } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { SentryService } from '../services/sentry.service';

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: Error | any): void {
    // Get SentryService lazily to avoid circular dependency
    const sentryService = this.injector.get(SentryService);

    // Extract error message and stack
    const message = error.message || error.toString();
    const stack = error.stack;

    // Add breadcrumb for the error
    sentryService.addBreadcrumb({
      message: `Error occurred: ${message}`,
      category: 'error',
      level: 'error',
      data: {
        name: error.name,
        message,
      },
    });

    // Set error context
    sentryService.setContext('error', {
      name: error.name,
      message,
      stack,
      originalError: error,
    });

    // Determine error type and capture accordingly
    if (this.shouldIgnoreError(error)) {
      console.warn('Ignored error:', message);
      return;
    }

    // Capture the error
    const eventId = sentryService.captureException(error, {
      tags: {
        error_type: error.name || 'UnknownError',
        error_handled_by: 'ErrorHandler',
      },
      level: 'error',
    });

    // Log to console in development
    console.error('Error handled by Sentry:', error, 'Event ID:', eventId);

    // Optionally show user feedback dialog for critical errors
    if (this.isCriticalError(error)) {
      // Only show in production or if explicitly enabled
      if (this.shouldShowFeedbackDialog()) {
        sentryService.showReportDialog(eventId);
      }
    }
  }

  /**
   * Determine if error should be ignored
   */
  private shouldIgnoreError(error: any): boolean {
    const message = error.message || error.toString();

    const ignoredPatterns = [
      /Non-Error promise rejection/i,
      /ResizeObserver loop/i,
      /Loading chunk \d+ failed/i, // Lazy loading failures (network issues)
      /ChunkLoadError/i,
      /^Script error\.?$/i,
      /^Javascript error: Script error\.? on line 0$/i,
    ];

    return ignoredPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Determine if error is critical
   */
  private isCriticalError(error: any): boolean {
    const criticalPatterns = [
      /Cannot read property.*of undefined/i,
      /Cannot read properties of undefined/i,
      /is not a function/i,
      /Network request failed/i,
      /Failed to fetch/i,
    ];

    const message = error.message || error.toString();
    return criticalPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Determine if feedback dialog should be shown
   */
  private shouldShowFeedbackDialog(): boolean {
    // Don't show in development
    if (window.location.hostname === 'localhost') {
      return false;
    }

    // Check if user has already seen dialog recently
    const lastShown = localStorage.getItem('sentry_feedback_shown');
    if (lastShown) {
      const timeSince = Date.now() - parseInt(lastShown, 10);
      // Don't show if shown within last 5 minutes
      if (timeSince < 5 * 60 * 1000) {
        return false;
      }
    }

    // Mark as shown
    localStorage.setItem('sentry_feedback_shown', Date.now().toString());
    return true;
  }
}

/**
 * Factory function for creating the error handler
 */
export function createErrorHandler(): ErrorHandler {
  return Sentry.createErrorHandler({
    showDialog: false, // We handle dialog showing manually
    logErrors: true,
  });
}
