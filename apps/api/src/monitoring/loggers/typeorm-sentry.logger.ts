import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';
import { SentryService } from '../sentry.service';
import { SENTRY_METRICS } from '../sentry.config';
import * as Sentry from '@sentry/node';

export class TypeOrmSentryLogger implements TypeOrmLogger {
  private readonly logger = new Logger('TypeORM');
  private sentryService?: SentryService;

  // Threshold for slow queries (ms)
  private readonly SLOW_QUERY_THRESHOLD = 500;

  constructor(sentryService?: SentryService) {
    this.sentryService = sentryService;
  }

  /**
   * Logs query and parameters used in it.
   */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const startTime = Date.now();

    // This is called before query execution, so we can't measure duration here
    // Duration is measured in logQuerySlow
    this.logger.debug(`Query: ${this.formatQuery(query, parameters)}`);
  }

  /**
   * Logs query that is failed.
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `Query failed: ${this.formatQuery(query, parameters)}`,
      errorStack
    );

    if (this.sentryService) {
      // Create a span for the failed query
      const transaction = Sentry.getCurrentScope().getSpan();
      if (transaction) {
        const span = transaction.startChild({
          op: 'db.query',
          description: this.truncateQuery(query),
          data: {
            'db.system': 'postgresql',
            'db.statement': query,
            'db.parameters': this.sanitizeParameters(parameters),
          },
        });

        span.setStatus('internal_error');
        span.finish();
      }

      // Capture the error
      this.sentryService.captureException(error instanceof Error ? error : new Error(errorMessage), {
        tags: {
          query_type: this.getQueryType(query),
          database: 'postgresql',
        },
        extra: {
          query: this.truncateQuery(query),
          parameters: this.sanitizeParameters(parameters),
        },
        level: 'error',
      });

      // Track error metric
      this.sentryService.incrementCounter(
        'db.query_errors',
        1,
        {
          query_type: this.getQueryType(query),
        }
      );
    }
  }

  /**
   * Logs query that is slow.
   */
  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.logger.warn(
      `Slow query (${time}ms): ${this.formatQuery(query, parameters)}`
    );

    if (this.sentryService) {
      // Track slow query metric
      this.sentryService.trackDistribution(
        SENTRY_METRICS.DB_QUERY_TIME,
        time,
        'millisecond',
        {
          query_type: this.getQueryType(query),
          slow: 'true',
        }
      );

      // Add breadcrumb for slow query
      this.sentryService.addBreadcrumb({
        message: `Slow database query: ${time}ms`,
        category: 'db.query',
        level: 'warning',
        data: {
          duration: time,
          query: this.truncateQuery(query),
          query_type: this.getQueryType(query),
        },
      });

      // Capture as message if extremely slow (> 2s)
      if (time > 2000) {
        this.sentryService.captureMessage(
          `Extremely slow database query: ${time}ms`,
          'warning',
          {
            tags: {
              query_type: this.getQueryType(query),
            },
            extra: {
              duration: time,
              query: this.truncateQuery(query),
              parameters: this.sanitizeParameters(parameters),
            },
          }
        );
      }
    }
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.log(message);
  }

  /**
   * Logs events from the migration run process.
   */
  logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.log(message);
  }

  /**
   * Perform logging using given logger, or by default to the console.
   */
  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    switch (level) {
      case 'log':
        this.logger.log(message);
        break;
      case 'info':
        this.logger.log(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
    }
  }

  /**
   * Format query with parameters for logging
   */
  private formatQuery(query: string, parameters?: any[]): string {
    const truncatedQuery = this.truncateQuery(query);
    if (parameters && parameters.length > 0) {
      return `${truncatedQuery} -- Parameters: ${JSON.stringify(this.sanitizeParameters(parameters))}`;
    }
    return truncatedQuery;
  }

  /**
   * Truncate query to prevent logging extremely long queries
   */
  private truncateQuery(query: string, maxLength: number = 500): string {
    const normalized = query.replace(/\s+/g, ' ').trim();
    if (normalized.length > maxLength) {
      return normalized.substring(0, maxLength) + '...';
    }
    return normalized;
  }

  /**
   * Sanitize parameters to remove sensitive data
   */
  private sanitizeParameters(parameters?: any[]): any[] {
    if (!parameters) {
      return [];
    }

    return parameters.map((param) => {
      if (typeof param === 'string') {
        // Check if it looks like sensitive data
        const lowerParam = param.toLowerCase();
        if (
          lowerParam.includes('password') ||
          lowerParam.includes('token') ||
          lowerParam.includes('secret') ||
          lowerParam.includes('key')
        ) {
          return '[FILTERED]';
        }
      }
      return param;
    });
  }

  /**
   * Determine query type (SELECT, INSERT, UPDATE, DELETE, etc.)
   */
  private getQueryType(query: string): string {
    const normalized = query.trim().toUpperCase();
    const match = normalized.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/);
    return match ? match[1] : 'OTHER';
  }
}
