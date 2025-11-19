import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import * as Sentry from '@sentry/angular';
import { SentryService } from '../services/sentry.service';
import { METRICS } from '../sentry.config';

@Injectable()
export class SentryHttpInterceptor implements HttpInterceptor {
  constructor(private sentryService: SentryService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    const url = new URL(req.url, window.location.origin);
    const endpoint = url.pathname;

    // Start a span for this HTTP request
    const transaction = Sentry.getCurrentScope().getSpan();
    const span = transaction
      ? transaction.startChild({
          op: 'http.client',
          description: `${req.method} ${endpoint}`,
          data: {
            'http.method': req.method,
            'http.url': endpoint,
            'http.query': url.search,
          },
        })
      : undefined;

    // Add breadcrumb for API call
    this.sentryService.addBreadcrumb({
      message: `API Request: ${req.method} ${endpoint}`,
      category: 'http',
      level: 'info',
      data: {
        method: req.method,
        url: endpoint,
        params: this.sanitizeParams(url.searchParams),
      },
    });

    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;

          // Track API call duration
          this.sentryService.trackDistribution(
            METRICS.API_CALL,
            duration,
            'millisecond',
            {
              method: req.method,
              endpoint,
              status: event.status.toString(),
            }
          );

          // Set span status
          if (span) {
            span.setHttpStatus(event.status);
            span.setData('http.response.status_code', event.status);
          }

          // Add breadcrumb for successful response
          this.sentryService.addBreadcrumb({
            message: `API Response: ${req.method} ${endpoint} - ${event.status}`,
            category: 'http',
            level: 'info',
            data: {
              method: req.method,
              url: endpoint,
              status: event.status,
              duration,
            },
          });

          // Log slow API calls
          if (duration > 2000) {
            this.sentryService.captureMessage(
              `Slow API call: ${req.method} ${endpoint} took ${duration}ms`,
              'warning',
              {
                tags: {
                  endpoint,
                  method: req.method,
                },
                extra: {
                  duration,
                  status: event.status,
                },
              }
            );
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const duration = Date.now() - startTime;

        // Set span status to error
        if (span) {
          span.setHttpStatus(error.status);
          span.setStatus('internal_error');
          span.setData('http.response.status_code', error.status);
        }

        // Track error metric
        this.sentryService.incrementCounter(
          'api.errors',
          1,
          {
            method: req.method,
            endpoint,
            status: error.status.toString(),
          }
        );

        // Add breadcrumb for error
        this.sentryService.addBreadcrumb({
          message: `API Error: ${req.method} ${endpoint} - ${error.status}`,
          category: 'http',
          level: 'error',
          data: {
            method: req.method,
            url: endpoint,
            status: error.status,
            statusText: error.statusText,
            duration,
          },
        });

        // Capture error in Sentry (only for 5xx errors)
        if (error.status >= 500) {
          this.sentryService.captureException(error, {
            tags: {
              http_method: req.method,
              http_status: error.status.toString(),
              endpoint,
            },
            extra: {
              url: req.url,
              duration,
              error_message: error.message,
              error_body: this.sanitizeErrorBody(error.error),
            },
            level: 'error',
          });
        } else if (error.status >= 400) {
          // Log 4xx errors as warnings
          this.sentryService.addBreadcrumb({
            message: `Client error: ${error.status} - ${error.statusText}`,
            category: 'http',
            level: 'warning',
            data: {
              method: req.method,
              endpoint,
              status: error.status,
            },
          });
        }

        return throwError(() => error);
      }),
      finalize(() => {
        // Finish the span
        if (span) {
          span.finish();
        }
      })
    );
  }

  /**
   * Sanitize URL parameters to remove sensitive data
   */
  private sanitizeParams(params: URLSearchParams): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveKeys = ['token', 'api_key', 'password', 'secret'];

    params.forEach((value, key) => {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[FILTERED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Sanitize error response body to remove sensitive data
   */
  private sanitizeErrorBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[FILTERED]';
      }
    });

    return sanitized;
  }
}
