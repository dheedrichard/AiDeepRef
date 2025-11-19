import { APP_INITIALIZER, ErrorHandler, Provider } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';
import { initializeSentry } from './sentry.config';
import { SentryErrorHandler } from './error-handlers/sentry-error.handler';

/**
 * Initialize Sentry on application bootstrap
 */
export function sentryInitializerFactory(): () => void {
  return () => {
    // Get DSN from environment or window object (set by build process)
    const dsn = environment.sentry.dsn || (window as any).SENTRY_DSN || '';

    // Get release from window object (set by build process)
    const release = (window as any).SENTRY_RELEASE || environment.production ? 'production' : 'development';

    initializeSentry({
      dsn,
      environment: environment.sentry.environment,
      release,
      tracesSampleRate: environment.sentry.tracesSampleRate,
      replaysSessionSampleRate: environment.sentry.replaysSessionSampleRate,
      replaysOnErrorSampleRate: environment.sentry.replaysOnErrorSampleRate,
    });
  };
}

/**
 * Provider for Sentry initialization
 */
export const SENTRY_INIT_PROVIDER: Provider = {
  provide: APP_INITIALIZER,
  useFactory: sentryInitializerFactory,
  multi: true,
};

/**
 * Provider for Sentry error handler
 */
export const SENTRY_ERROR_HANDLER_PROVIDER: Provider = {
  provide: ErrorHandler,
  useClass: SentryErrorHandler,
};

/**
 * Provider for Sentry trace service (router integration)
 */
export function sentryTraceServiceFactory(router: Router): void {
  // This doesn't need to return anything, just set up the integration
  Sentry.browserTracingIntegration();
}

export const SENTRY_TRACE_SERVICE_PROVIDER: Provider = {
  provide: APP_INITIALIZER,
  useFactory: sentryTraceServiceFactory,
  deps: [Router],
  multi: true,
};

/**
 * All Sentry providers
 */
export const SENTRY_PROVIDERS: Provider[] = [
  SENTRY_INIT_PROVIDER,
  SENTRY_ERROR_HANDLER_PROVIDER,
  SENTRY_TRACE_SERVICE_PROVIDER,
];
