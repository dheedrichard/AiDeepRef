/**
 * Production Environment Configuration
 */
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  apiTimeout: 30000,

  // Sentry Configuration
  sentry: {
    dsn: '', // Set via environment variable SENTRY_DSN
    environment: 'production',
    tracesSampleRate: 0.2, // 20% sampling in production
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions
  },
};
