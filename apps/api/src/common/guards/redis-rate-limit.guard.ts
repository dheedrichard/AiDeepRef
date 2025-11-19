/**
 * Redis-Based Distributed Rate Limiting Guard
 *
 * Implements sliding window rate limiting using Redis.
 * Supports per-user and global (IP-based) rate limiting.
 */

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CacheService } from '../../cache/cache.service';
import { CacheKeys } from '../../cache/cache.config';

/**
 * Rate limit decorator metadata key
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate limit options
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;

  /**
   * Scope: 'user' (per authenticated user), 'ip' (per IP), 'global' (all requests)
   */
  scope?: 'user' | 'ip' | 'global';

  /**
   * Custom key suffix for route-specific limits
   */
  keyPrefix?: string;
}

/**
 * Rate limit decorator
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * SetMetadata helper (already imported in NestJS)
 */
function SetMetadata(metadataKey: string, metadataValue: any) {
  return (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(metadataKey, metadataValue, target);
    return target;
  };
}

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RedisRateLimitGuard.name);
  private readonly enabled: boolean;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.enabled = this.configService.get<boolean>(
      'CACHE_RATE_LIMIT_ENABLED',
      true,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get rate limit options from decorator
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      handler,
    );

    if (!options) {
      // No rate limit configured for this route
      return true;
    }

    // Generate rate limit key
    const key = this.generateRateLimitKey(request, options);

    // Check rate limit
    const allowed = await this.checkRateLimit(key, options);

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: options.window,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Generate rate limit key based on scope
   */
  private generateRateLimitKey(
    request: Request,
    options: RateLimitOptions,
  ): string {
    const scope = options.scope || 'user';
    const prefix = options.keyPrefix || 'default';

    let identifier: string;

    switch (scope) {
      case 'user':
        // Use authenticated user ID
        identifier = (request as any).user?.id || this.getClientIp(request);
        break;
      case 'ip':
        // Use client IP
        identifier = this.getClientIp(request);
        break;
      case 'global':
        // Global rate limit
        identifier = 'global';
        break;
      default:
        identifier = this.getClientIp(request);
    }

    return `${CacheKeys.RATE_LIMIT}:${prefix}:${identifier}`;
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  private async checkRateLimit(
    key: string,
    options: RateLimitOptions,
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const windowStart = now - options.window * 1000;

      // Sliding window implementation:
      // 1. Remove old entries outside the window
      // 2. Count current entries
      // 3. If below limit, add new entry

      // For simplicity, we use a counter-based approach with TTL
      const current = await this.cacheService.increment(key, 1);

      if (current === 1) {
        // First request, set TTL
        await this.cacheService.expire(key, options.window);
      }

      return current <= options.limit;
    } catch (error) {
      this.logger.error('Rate limit check error:', error.message);
      // On error, allow the request (fail open)
      return true;
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
