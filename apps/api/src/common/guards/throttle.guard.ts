/**
 * Custom Throttle Guard
 *
 * Enhanced rate limiting with custom logic
 * Features:
 * - IP-based rate limiting
 * - User-based rate limiting for authenticated users
 * - Bypass for admin users
 * - Custom response messages
 */

import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottleGuard.name);

  constructor(
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Bypass rate limiting for admin users
    if (user && user.role === 'admin') {
      this.logger.debug(`Rate limit bypassed for admin user: ${user.email}`);
      return true;
    }

    // Check if route should skip throttling
    const skipThrottle = this.reflector.getAllAndOverride<boolean>('skipThrottle', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipThrottle) {
      return true;
    }

    try {
      const result = await super.canActivate(context);

      if (!result) {
        this.logRateLimitExceeded(request);
      }

      return result;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        this.logRateLimitExceeded(request);
        throw new ThrottlerException(this.getErrorMessage(request));
      }
      throw error;
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use both IP and user ID for tracking (if authenticated)
    const ip = this.getIp(req);
    const userId = req.user?.id;

    if (userId) {
      // For authenticated users, use user ID as primary tracker
      return `user:${userId}`;
    }

    // For anonymous users, use IP address
    return `ip:${ip}`;
  }

  private getIp(req: Record<string, any>): string {
    // Handle proxied requests
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Handle CloudFlare
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) {
      return cfIp;
    }

    // Handle standard IP
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  private logRateLimitExceeded(request: any): void {
    const method = request.method;
    const url = request.url;
    const ip = this.getIp(request);
    const user = request.user;

    if (user) {
      this.logger.warn(
        `Rate limit exceeded for authenticated user ${user.email} (${ip}) on ${method} ${url}`
      );
    } else {
      this.logger.warn(
        `Rate limit exceeded for IP ${ip} on ${method} ${url}`
      );
    }

    // Log potential DDoS attempts
    const rateLimitKey = `rateLimit:${ip}`;
    const attempts = parseInt(request.session?.[rateLimitKey] || '0', 10) + 1;

    if (attempts > 10) {
      this.logger.error(`Potential DDoS attack from IP ${ip} - ${attempts} rate limit violations`);
    }

    if (request.session) {
      request.session[rateLimitKey] = attempts;
    }
  }

  private getErrorMessage(request: any): string {
    const endpoint = request.url;

    // Custom messages for specific endpoints
    if (endpoint.includes('/auth/signin') || endpoint.includes('/auth/signup')) {
      return 'Too many authentication attempts. Please wait before trying again.';
    }

    if (endpoint.includes('/auth/forgot-password')) {
      return 'Too many password reset requests. Please wait before trying again.';
    }

    if (endpoint.includes('/upload')) {
      return 'Upload rate limit exceeded. Please wait before uploading more files.';
    }

    if (endpoint.includes('/ai/')) {
      return 'AI processing rate limit exceeded. Please wait before making more requests.';
    }

    // Default message
    return 'Rate limit exceeded. Please wait before making more requests.';
  }

  protected getErrorMessage(error: Error): Error {
    return error;
  }
}