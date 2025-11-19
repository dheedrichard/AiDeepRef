/**
 * Example: Authentication Caching
 *
 * Demonstrates caching strategies for authentication:
 * - JWT blacklist (revoked tokens)
 * - Session management
 * - Permission checks
 */

import { Injectable } from '@nestjs/common';
import { CacheKeys, CacheTTL } from '../cache.config';
import { CacheService } from '../cache.service';

@Injectable()
export class AuthCacheExampleService {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Add JWT token to blacklist (revoked tokens)
   * TTL should match JWT expiration
   */
  async revokeToken(jti: string, expiresIn: number): Promise<void> {
    const key = `${CacheKeys.AUTH_BLACKLIST}:${jti}`;
    await this.cacheService.set(key, true, expiresIn);
  }

  /**
   * Check if JWT token is revoked
   */
  async isTokenRevoked(jti: string): Promise<boolean> {
    const key = `${CacheKeys.AUTH_BLACKLIST}:${jti}`;
    const revoked = await this.cacheService.exists(key);
    return revoked;
  }

  /**
   * Cache user session
   * TTL: 1 hour
   */
  async cacheSession(sessionId: string, sessionData: any): Promise<void> {
    const key = `${CacheKeys.AUTH_SESSION}:${sessionId}`;
    await this.cacheService.set(key, sessionData, CacheTTL.VERY_LONG);
  }

  /**
   * Get cached session
   */
  async getSession(sessionId: string): Promise<any> {
    const key = `${CacheKeys.AUTH_SESSION}:${sessionId}`;
    return await this.cacheService.get(key);
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${CacheKeys.AUTH_SESSION}:${sessionId}`;
    await this.cacheService.delete(key);
  }

  /**
   * Cache permission check result
   * TTL: 5 minutes
   */
  async cachePermissionCheck(
    userId: string,
    resource: string,
    action: string,
    hasPermission: boolean,
  ): Promise<void> {
    const key = `${CacheKeys.USER_PERMISSIONS}:${userId}:${resource}:${action}`;
    await this.cacheService.set(key, hasPermission, CacheTTL.SHORT);
  }

  /**
   * Get cached permission check
   */
  async getCachedPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean | null> {
    const key = `${CacheKeys.USER_PERMISSIONS}:${userId}:${resource}:${action}`;
    return await this.cacheService.get(key);
  }

  /**
   * Invalidate all permissions for user
   * Useful when user roles change
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    const pattern = `${CacheKeys.USER_PERMISSIONS}:${userId}:*`;
    await this.cacheService.deletePattern(pattern);
  }

  /**
   * Track login attempts with Redis counter
   * Used for rate limiting and account lockout
   */
  async incrementLoginAttempts(
    identifier: string,
    windowSeconds: number = 900,
  ): Promise<number> {
    const key = `auth:login-attempts:${identifier}`;
    const attempts = await this.cacheService.increment(key, 1);

    if (attempts === 1) {
      // First attempt, set TTL
      await this.cacheService.expire(key, windowSeconds);
    }

    return attempts;
  }

  /**
   * Get login attempts count
   */
  async getLoginAttempts(identifier: string): Promise<number> {
    const key = `auth:login-attempts:${identifier}`;
    const count = await this.cacheService.get<number>(key);
    return count || 0;
  }

  /**
   * Reset login attempts (after successful login)
   */
  async resetLoginAttempts(identifier: string): Promise<void> {
    const key = `auth:login-attempts:${identifier}`;
    await this.cacheService.delete(key);
  }
}
