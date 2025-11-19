import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from '../sentry.service';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  constructor(private readonly sentryService: SentryService) {}

  catch(exception: Error | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Determine error message
    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Get error response for HttpException
    const errorResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Only capture errors (5xx) in Sentry, not client errors (4xx)
    const shouldCapture = status >= 500;

    if (shouldCapture) {
      // Set request context
      this.sentryService.setContext('request', {
        method: request.method,
        url: request.url,
        params: request.params,
        query: this.sanitizeQuery(request.query),
        headers: this.sanitizeHeaders(request.headers as Record<string, string>),
        ip: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      // Set response context
      this.sentryService.setContext('response', {
        statusCode: status,
        message,
      });

      // Add breadcrumb for the error
      this.sentryService.addBreadcrumb({
        message: `HTTP ${status} - ${request.method} ${request.url}`,
        category: 'http',
        level: 'error',
        data: {
          method: request.method,
          url: request.url,
          status,
        },
      });

      // Set tags
      this.sentryService.setTags({
        'http.method': request.method,
        'http.status_code': status.toString(),
        'http.url': request.url,
        endpoint: `${request.method} ${request.route?.path || request.url}`,
      });

      // Capture the exception
      const eventId = this.sentryService.captureException(exception, {
        level: 'error',
        tags: {
          error_type: exception.constructor.name,
        },
        extra: {
          errorResponse: typeof errorResponse === 'object' ? errorResponse : null,
        },
      });

      this.logger.error(
        `Exception captured: ${message}`,
        exception.stack,
        `Sentry Event ID: ${eventId}`
      );
    } else {
      // Log client errors but don't send to Sentry
      this.logger.warn(
        `Client error: ${status} - ${request.method} ${request.url} - ${message}`
      );
    }

    // Send error response
    const errorPayload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.getErrorMessage(errorResponse, message),
      ...(shouldCapture && {
        sentryEventId: Sentry.lastEventId(),
      }),
    };

    response.status(status).json(errorPayload);
  }

  /**
   * Sanitize query parameters to remove sensitive data
   */
  private sanitizeQuery(query: any): any {
    if (!query || typeof query !== 'object') {
      return query;
    }

    const sanitized = { ...query };
    const sensitiveParams = ['token', 'api_key', 'password', 'secret', 'apiKey'];

    sensitiveParams.forEach(param => {
      if (sanitized[param]) {
        sanitized[param] = '[FILTERED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize headers to remove sensitive data
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-csrf-token',
      'x-api-key',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[FILTERED]';
      }
    });

    return sanitized;
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.headers['x-real-ip'] as string ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Extract error message from exception response
   */
  private getErrorMessage(errorResponse: any, fallback: string): string | string[] {
    if (!errorResponse) {
      return fallback;
    }

    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    if (typeof errorResponse === 'object') {
      return errorResponse.message || errorResponse.error || fallback;
    }

    return fallback;
  }
}
