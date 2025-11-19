/**
 * Cache Module Exports
 * 
 * Barrel export for easy importing of cache functionality
 */

// Module
export { CacheModule } from './cache.module';

// Services
export { CacheService } from './cache.service';
export { CacheMetricsService } from './cache-metrics.service';

// Configuration
export { CacheKeys, CacheTTL, cacheConfig } from './cache.config';

// Decorators
export { Cacheable, CacheableOptions } from './decorators/cacheable.decorator';
export {
  CacheInvalidate,
  CacheInvalidateOptions,
} from './decorators/cache-invalidate.decorator';

// Guards
export { RedisRateLimitGuard, RateLimit, RateLimitOptions } from '../common/guards/redis-rate-limit.guard';

// Interfaces
export type {
  CacheMetrics,
  CacheOperation,
  CacheHealth,
} from './interfaces/cache-metrics.interface';

// Health
export { RedisHealthIndicator } from './health/redis.health';

// Cache Warming
export { CacheWarmingService } from './jobs/cache-warming.service';
