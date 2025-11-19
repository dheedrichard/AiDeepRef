/**
 * Development Environment Configuration
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  apiTimeout: 30000,

  // Sentry Configuration
  sentry: {
    dsn: '', // Set via environment variable SENTRY_DSN
    environment: 'development',
    tracesSampleRate: 1.0, // 100% in development
    replaysSessionSampleRate: 1.0, // 100% in development
    replaysOnErrorSampleRate: 1.0,
  },
};
