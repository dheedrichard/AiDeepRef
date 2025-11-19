/**
 * Cache Service
 *
 * Comprehensive wrapper around NestJS CacheManager providing:
 * - Type-safe cache operations
 * - Pattern-based key deletion
 * - Metrics collection
 * - Circuit breaker pattern for graceful degradation
 * - Logging and error handling
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly enabled: boolean;
  private redis: Redis | null = null;
  private circuitBreakerOpen = false;
  private failureCount = 0;
  private readonly maxFailures = 5;
  private readonly resetTimeout = 60000; // 1 minute

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('CACHE_ENABLED', true);
    this.initializeRedisClient();
  }

  /**
   * Initialize direct Redis client for advanced operations
   */
  private initializeRedisClient() {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 3) return null;
          return Math.min(times * 50, 2000);
        },
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis connection error:', err);
        this.handleFailure();
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis client connected successfully');
        this.resetCircuitBreaker();
      });

      this.redis.connect().catch((err) => {
        this.logger.warn('Failed to connect Redis client:', err.message);
      });
    } catch (error) {
      this.logger.warn('Redis client initialization failed:', error.message);
    }
  }

  /**
   * Circuit breaker: handle failures
   */
  private handleFailure() {
    this.failureCount++;
    if (this.failureCount >= this.maxFailures) {
      this.circuitBreakerOpen = true;
      this.logger.warn('Circuit breaker opened - cache disabled temporarily');
      setTimeout(() => this.resetCircuitBreaker(), this.resetTimeout);
    }
  }

  /**
   * Circuit breaker: reset
   */
  private resetCircuitBreaker() {
    this.circuitBreakerOpen = false;
    this.failureCount = 0;
    this.logger.log('Circuit breaker reset - cache enabled');
  }

  /**
   * Check if cache is available
   */
  private isCacheAvailable(): boolean {
    return this.enabled && !this.circuitBreakerOpen;
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isCacheAvailable()) return null;

    const startTime = Date.now();
    try {
      const value = await this.cacheManager.get<T>(key);
      const latency = Date.now() - startTime;

      if (latency > 50) {
        this.logger.warn(`Slow cache GET: ${key} took ${latency}ms`);
      }

      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      }

      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error.message);
      this.handleFailure();
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isCacheAvailable()) return;

    const startTime = Date.now();
    try {
      const ttlMs = ttl ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);

      const latency = Date.now() - startTime;
      if (latency > 50) {
        this.logger.warn(`Slow cache SET: ${key} took ${latency}ms`);
      }

      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error.message);
      this.handleFailure();
    }
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error.message);
      this.handleFailure();
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Key pattern (e.g., 'user:profile:*')
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isCacheAvailable() || !this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache DELETE pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Cache DELETE pattern error for ${pattern}:`, error.message);
      this.handleFailure();
    }
  }

  /**
   * Get or set: Fetch from cache, or compute and cache if not found
   * @param key Cache key
   * @param factory Function to compute value if cache miss
   * @param ttl Time to live in seconds (optional)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment a numeric value in cache
   * @param key Cache key
   * @param by Amount to increment (default: 1)
   * @returns New value after increment
   */
  async increment(key: string, by: number = 1): Promise<number> {
    if (!this.isCacheAvailable() || !this.redis) return 0;

    try {
      const result = await this.redis.incrby(key, by);
      this.logger.debug(`Cache INCREMENT: ${key} by ${by} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Cache INCREMENT error for key ${key}:`, error.message);
      this.handleFailure();
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isCacheAvailable() || !this.redis) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error.message);
      this.handleFailure();
      return false;
    }
  }

  /**
   * Set expiration on existing key
   * @param key Cache key
   * @param ttl Time to live in seconds
   */
  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isCacheAvailable() || !this.redis) return;

    try {
      await this.redis.expire(key, ttl);
      this.logger.debug(`Cache EXPIRE: ${key} in ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache EXPIRE error for key ${key}:`, error.message);
      this.handleFailure();
    }
  }

  /**
   * Get remaining TTL for a key
   * @param key Cache key
   * @returns TTL in seconds, or -1 if key doesn't exist, -2 if no expiration
   */
  async ttl(key: string): Promise<number> {
    if (!this.isCacheAvailable() || !this.redis) return -1;

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}:`, error.message);
      this.handleFailure();
      return -1;
    }
  }

  /**
   * Reset the cache (clear all keys)
   * WARNING: Use with caution!
   */
  async reset(): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      await this.cacheManager.reset();
      this.logger.warn('Cache RESET: All keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error.message);
      this.handleFailure();
    }
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<{ connected: boolean; latency: number }> {
    if (!this.redis) {
      return { connected: false, latency: -1 };
    }

    const startTime = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - startTime;
      return { connected: true, latency };
    } catch (error) {
      return { connected: false, latency: -1 };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis client disconnected');
    }
  }
}
