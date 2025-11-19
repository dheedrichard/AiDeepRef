/**
 * Helmet Middleware
 *
 * Adds security headers to HTTP responses
 * Protects against common web vulnerabilities
 */

import helmet from 'helmet';

export const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.deepref.ai', 'wss://api.deepref.ai'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin', 'allow-popups'],
      reportUri: '/api/v1/security/csp-report',
      upgradeInsecureRequests: [],
    },
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: true,

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frameguard - prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide powered-by header
  hidePoweredBy: true,

  // HSTS - HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open - force IE users to save downloads
  ieNoOpen: true,

  // No Sniff - prevent MIME type sniffing
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS Filter
  xssFilter: true,
});