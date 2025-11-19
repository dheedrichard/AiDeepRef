/**
 * Example: User Profile Caching
 *
 * Demonstrates how to implement caching for user profiles using:
 * - @Cacheable decorator for reads
 * - @CacheInvalidate decorator for updates
 * - Manual cache management
 */

import { Injectable } from '@nestjs/common';
import { Cacheable } from '../decorators/cacheable.decorator';
import {
  CacheInvalidate,
  createInvalidationKeyGenerator,
} from '../decorators/cache-invalidate.decorator';
import { CacheKeys, CacheTTL } from '../cache.config';
import { CacheService } from '../cache.service';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLogin: Date;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
}

@Injectable()
export class UserCacheExampleService {
  constructor(public readonly cacheService: CacheService) {}

  /**
   * Get user profile with caching
   * Cache key: user:profile:{userId}
   * TTL: 10 minutes
   */
  @Cacheable({
    key: CacheKeys.USER_PROFILE,
    ttl: CacheTTL.MEDIUM, // 10 minutes
  })
  async getUserProfile(userId: string): Promise<UserProfile> {
    console.log('Fetching user from database:', userId);

    // Simulate database query
    return {
      id: userId,
      email: 'user@example.com',
      name: 'John Doe',
      role: 'user',
      lastLogin: new Date(),
    };
  }

  /**
   * Get user permissions with caching
   * Cache key: user:permissions:{userId}
   * TTL: 5 minutes
   */
  @Cacheable({
    key: CacheKeys.USER_PERMISSIONS,
    ttl: CacheTTL.SHORT, // 5 minutes
  })
  async getUserPermissions(userId: string): Promise<string[]> {
    console.log('Fetching user permissions from database:', userId);

    // Simulate database query
    return ['read:bundles', 'write:bundles', 'read:references'];
  }

  /**
   * Update user profile and invalidate cache
   * Invalidates: user:profile:{userId}, user:permissions:{userId}
   */
  @CacheInvalidate({
    keys: ['user:profile:{0}', 'user:permissions:{0}'],
  })
  async updateUserProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserProfile> {
    console.log('Updating user in database:', userId);

    // Simulate database update
    return {
      id: userId,
      email: dto.email || 'user@example.com',
      name: dto.name || 'John Doe',
      role: 'user',
      lastLogin: new Date(),
    };
  }

  /**
   * Delete user and invalidate all related cache
   * Invalidates: all keys matching user:*:{userId}
   */
  @CacheInvalidate({
    keyGenerator: (userId: string) => [`user:*:${userId}`],
  })
  async deleteUser(userId: string): Promise<void> {
    console.log('Deleting user from database:', userId);
    // Simulate database deletion
  }

  /**
   * Manual cache management example
   */
  async manualCacheExample(userId: string): Promise<void> {
    // Check if cached
    const cacheKey = `${CacheKeys.USER_PROFILE}:${userId}`;
    const exists = await this.cacheService.exists(cacheKey);

    if (exists) {
      console.log('User profile is cached');

      // Get TTL
      const ttl = await this.cacheService.ttl(cacheKey);
      console.log(`TTL: ${ttl} seconds`);
    } else {
      console.log('User profile is not cached');

      // Fetch and cache
      const profile = await this.getUserProfile(userId);
      await this.cacheService.set(cacheKey, profile, CacheTTL.MEDIUM);
    }
  }
}
