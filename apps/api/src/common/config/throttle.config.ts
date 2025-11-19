/**
 * Rate Limiting Configuration
 *
 * Configures different rate limits for various endpoints
 * Prevents abuse and DDoS attacks
 */

import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttleConfig: ThrottlerModuleOptions = [
  {
    // Default rate limit
    name: 'default',
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
  {
    // Strict rate limit for authentication endpoints
    name: 'auth',
    ttl: 60000, // 1 minute
    limit: 5, // 5 requests per minute
  },
  {
    // Rate limit for password reset
    name: 'password-reset',
    ttl: 3600000, // 1 hour
    limit: 3, // 3 requests per hour
  },
  {
    // Rate limit for email verification
    name: 'email-verification',
    ttl: 300000, // 5 minutes
    limit: 3, // 3 requests per 5 minutes
  },
  {
    // Rate limit for file uploads
    name: 'upload',
    ttl: 60000, // 1 minute
    limit: 10, // 10 uploads per minute
  },
  {
    // Rate limit for AI endpoints
    name: 'ai',
    ttl: 60000, // 1 minute
    limit: 20, // 20 requests per minute
  },
  {
    // Rate limit for admin endpoints
    name: 'admin',
    ttl: 60000, // 1 minute
    limit: 200, // 200 requests per minute
  },
  {
    // Rate limit for public endpoints
    name: 'public',
    ttl: 60000, // 1 minute
    limit: 30, // 30 requests per minute
  },
];

export const getThrottleConfig = (): ThrottlerModuleOptions => {
  const env = process.env.NODE_ENV;

  // Disable rate limiting in test environment
  if (env === 'test') {
    return [
      {
        name: 'default',
        ttl: 1,
        limit: 10000,
      },
    ];
  }

  return throttleConfig;
};