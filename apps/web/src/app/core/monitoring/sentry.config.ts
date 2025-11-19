import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}

export function initializeSentry(config: SentryConfig): void {
  const {
    dsn,
    environment: env,
    release,
    tracesSampleRate = 0.2,
    replaysSessionSampleRate = 0.1,
    replaysOnErrorSampleRate = 1.0,
  } = config;

  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured - monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: env,
    release,

    // Performance Monitoring
    tracesSampleRate,
    tracePropagationTargets: ['localhost', /^https:\/\/api\.deepref\.com/],

    // Session Replay
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,

    // Integrations
    integrations: [
      // Browser tracing (web vitals, navigation, etc.)
      Sentry.browserTracingIntegration({
        // Enable automatic instrumentation of user interactions
        enableInp: true,
      }),

      // Session replay
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        maskAllInputs: true,
        // Privacy settings
        mask: ['.sensitive', '[data-sensitive]'],
        block: ['.no-replay', '[data-no-replay]', 'input[type="password"]'],
      }),

      // Breadcrumbs
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        sentry: true,
        xhr: true,
      }),

      // Global handlers
      Sentry.globalHandlersIntegration({
        onerror: true,
        onunhandledrejection: true,
      }),
    ],

    // Error Filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.epicplay.com',
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'http://loading.retry.widdit.com/',
      'atomicFindClose',
      // Random plugins/extensions
      'fb_xd_fragment',
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      // Angular-specific errors to ignore
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
    ],

    // Data Scrubbing
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        // Remove cookies
        if (event.request.cookies) {
          delete event.request.cookies;
        }

        // Sanitize headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-csrf-token'];
        }

        // Sanitize query parameters
        if (event.request.query_string) {
          const sensitiveParams = ['token', 'api_key', 'password'];
          let queryString = event.request.query_string;
          sensitiveParams.forEach((param) => {
            queryString = queryString.replace(
              new RegExp(`${param}=[^&]*`, 'gi'),
              `${param}=[FILTERED]`
            );
          });
          event.request.query_string = queryString;
        }
      }

      // Sanitize breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            const sanitized = { ...breadcrumb.data };
            ['password', 'token', 'apiKey', 'creditCard'].forEach((key) => {
              if (sanitized[key]) {
                sanitized[key] = '[FILTERED]';
              }
            });
            return { ...breadcrumb, data: sanitized };
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Transaction filtering
    beforeSendTransaction(event) {
      // Don't send transactions for assets
      if (event.transaction?.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
        return null;
      }
      return event;
    },

    // Enable debug mode in development
    debug: !environment.production,

    // Automatically capture console logs as breadcrumbs
    logLevel: environment.production ? Sentry.Severity.Error : Sentry.Severity.Debug,
  });

  console.log(`✅ Sentry initialized for environment: ${env}`);
}

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets
  lcp: 2500, // Largest Contentful Paint (ms)
  fid: 100, // First Input Delay (ms)
  cls: 0.1, // Cumulative Layout Shift (score)
  fcp: 1800, // First Contentful Paint (ms)
  ttfb: 600, // Time to First Byte (ms)
  inp: 200, // Interaction to Next Paint (ms)

  // Custom metrics
  componentLoad: 500, // Component initialization (ms)
  apiCall: 1000, // API response time (ms)
  stateUpdate: 50, // State update time (ms)
};

// Metric names for tracking
export const METRICS = {
  PAGE_LOAD: 'page.load_time',
  COMPONENT_LOAD: 'component.load_time',
  API_CALL: 'api.call_duration',
  STATE_UPDATE: 'state.update_duration',
  USER_INTERACTION: 'user.interaction',
  NAVIGATION: 'navigation.duration',
  ERROR_BOUNDARY: 'error.boundary_triggered',
};
