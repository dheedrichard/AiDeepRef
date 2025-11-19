import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { SentryService } from '../sentry.service';
import { SENTRY_METRICS } from '../sentry.config';
import * as Sentry from '@sentry/node';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, route } = request;
    const endpoint = route?.path || url;

    // Start transaction for this request
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${method} ${endpoint}`,
      tags: {
        'http.method': method,
        'http.route': endpoint,
      },
    });

    // Set transaction on the scope
    Sentry.getCurrentScope().setSpan(transaction);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Success handling
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();

        // Track latency distribution
        this.sentryService.trackDistribution(
          SENTRY_METRICS.API_LATENCY,
          duration,
          'millisecond',
          {
            endpoint,
            method,
            status: response.statusCode?.toString() || '200',
          }
        );

        // Increment request counter
        this.sentryService.incrementCounter(
          SENTRY_METRICS.API_REQUESTS,
          1,
          {
            endpoint,
            method,
            status: response.statusCode?.toString() || '200',
          }
        );

        // Set transaction status
        transaction.setHttpStatus(response.statusCode || 200);
        transaction.setData('response.status_code', response.statusCode || 200);
        transaction.setData('response.duration_ms', duration);

        // Finish transaction
        transaction.finish();

        // Log slow requests
        if (duration > 1000) {
          this.logger.warn(`Slow request: ${method} ${endpoint} took ${duration}ms`);
        }
      }),
      catchError((error) => {
        // Error handling
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || 500;

        // Track error latency
        this.sentryService.trackDistribution(
          SENTRY_METRICS.API_LATENCY,
          duration,
          'millisecond',
          {
            endpoint,
            method,
            status: statusCode.toString(),
            error: 'true',
          }
        );

        // Increment error counter
        this.sentryService.incrementCounter(
          SENTRY_METRICS.API_ERRORS,
          1,
          {
            endpoint,
            method,
            status: statusCode.toString(),
            error_type: error.constructor?.name || 'UnknownError',
          }
        );

        // Set transaction status to error
        transaction.setHttpStatus(statusCode);
        transaction.setStatus('internal_error');
        transaction.setData('error', error.message);
        transaction.setData('response.duration_ms', duration);

        // Finish transaction
        transaction.finish();

        // Re-throw error
        return throwError(() => error);
      })
    );
  }
}
