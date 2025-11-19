/**
 * Redis Cache Configuration
 *
 * Provides centralized configuration for Redis caching with connection pooling,
 * TTL management, and feature flags.
 */

import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisClientOptions } from 'redis';

export const cacheConfig: CacheModuleAsyncOptions<RedisClientOptions> = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const store = await redisStore({
      socket: {
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
      },
      password: configService.get<string>('REDIS_PASSWORD'),
      database: configService.get<number>('REDIS_DB', 0),
      // Connection pooling and retry strategy
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000); // Exponential backoff
      },
      // Performance optimizations
      enableOfflineQueue: true,
      enableAutoPipelining: true,
      // Timeouts
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    return {
      store,
      ttl: configService.get<number>('REDIS_TTL_DEFAULT', 300) * 1000, // Convert to milliseconds
      max: 1000, // Maximum number of items in cache
    };
  },
};

/**
 * Cache TTL Constants (in seconds)
 */
export const CacheTTL = {
  VERY_SHORT: 60, // 1 minute
  SHORT: 300, // 5 minutes
  MEDIUM: 600, // 10 minutes
  LONG: 900, // 15 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

/**
 * Cache Key Prefixes
 * Format: {service}:{entity}:{id}
 */
export const CacheKeys = {
  USER_PROFILE: 'user:profile',
  USER_PERMISSIONS: 'user:permissions',
  AUTH_SESSION: 'auth:session',
  AUTH_BLACKLIST: 'auth:blacklist',
  AUTH_JWT: 'auth:jwt',
  AI_PROMPT: 'ai:prompt',
  AI_RESPONSE: 'ai:response',
  BUNDLE: 'bundle',
  BUNDLE_RCS: 'bundle:rcs',
  REFERENCE: 'reference',
  RATE_LIMIT: 'ratelimit',
  RATE_LIMIT_GLOBAL: 'ratelimit:global',
} as const;

/**
 * Cache feature flags
 */
export interface CacheFeatureFlags {
  enabled: boolean;
  userProfiles: boolean;
  aiPrompts: boolean;
  bundles: boolean;
  authentication: boolean;
  rateLimit: boolean;
}

export const getCacheFeatureFlags = (
  configService: ConfigService,
): CacheFeatureFlags => ({
  enabled: configService.get<boolean>('CACHE_ENABLED', true),
  userProfiles: configService.get<boolean>('CACHE_USER_PROFILES_ENABLED', true),
  aiPrompts: configService.get<boolean>('CACHE_AI_PROMPTS_ENABLED', true),
  bundles: configService.get<boolean>('CACHE_BUNDLES_ENABLED', true),
  authentication: configService.get<boolean>('CACHE_AUTH_ENABLED', true),
  rateLimit: configService.get<boolean>('CACHE_RATE_LIMIT_ENABLED', true),
});
