import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  cost: number;
  tokenUsage: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  costSaved: number;
  tokensSaved: number;
  memoryUsage: number;
}

/**
 * AI Response Cache Service
 *
 * Implements an in-memory LRU cache for AI responses to:
 * - Reduce API calls and costs
 * - Improve response times
 * - Optimize token usage
 *
 * Features:
 * - TTL-based expiration
 * - Size-based eviction (LRU)
 * - Cost and token tracking
 * - Cache statistics
 */
@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private cache: Map<string, CacheEntry<any>> = new Map();
  private accessOrder: string[] = []; // For LRU tracking

  private readonly enabled: boolean;
  private readonly ttlMs: number;
  private readonly maxSize: number;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    costSaved: 0,
    tokensSaved: 0,
  };

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('AI_CACHE_ENABLED', true);
    this.ttlMs = this.configService.get<number>('AI_CACHE_TTL_MS', 3600000); // 1 hour default
    this.maxSize = this.configService.get<number>('AI_CACHE_MAX_SIZE', 1000);

    if (this.enabled) {
      this.logger.log(
        `AI Cache initialized: TTL=${this.ttlMs}ms, MaxSize=${this.maxSize}`,
      );
      this.startCleanupInterval();
    } else {
      this.logger.log('AI Cache disabled');
    }
  }

  /**
   * Generate cache key from prompt and options
   */
  private generateKey(
    taskType: string,
    prompt: string,
    options?: Record<string, any>,
  ): string {
    const data = {
      taskType,
      prompt: prompt.trim().toLowerCase(),
      options: options || {},
    };

    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Get cached response
   */
  get<T>(
    taskType: string,
    prompt: string,
    options?: Record<string, any>,
  ): T | null {
    if (!this.enabled) {
      return null;
    }

    const key = this.generateKey(taskType, prompt, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    // Update entry hits and statistics
    entry.hits++;
    this.stats.hits++;
    this.stats.costSaved += entry.cost;
    this.stats.tokensSaved += entry.tokenUsage;

    this.logger.debug(
      `Cache HIT for ${taskType}: Saved $${entry.cost.toFixed(4)}, ${entry.tokenUsage} tokens`,
    );

    return entry.data;
  }

  /**
   * Set cached response
   */
  set<T>(
    taskType: string,
    prompt: string,
    data: T,
    metadata: {
      cost: number;
      tokenUsage: number;
      options?: Record<string, any>;
    },
  ): void {
    if (!this.enabled) {
      return;
    }

    const key = this.generateKey(taskType, prompt, metadata.options);

    // Check if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      cost: metadata.cost,
      tokenUsage: metadata.tokenUsage,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    this.logger.debug(
      `Cache SET for ${taskType}: Cost=$${metadata.cost.toFixed(4)}, Tokens=${metadata.tokenUsage}`,
    );
  }

  /**
   * Invalidate cache for specific task type
   */
  invalidate(taskType?: string): void {
    if (!taskType) {
      // Clear all cache
      const size = this.cache.size;
      this.cache.clear();
      this.accessOrder = [];
      this.logger.log(`Cache cleared: ${size} entries removed`);
      return;
    }

    // Clear specific task type (would need to track taskType in entry)
    // For now, just clear all
    this.invalidate();
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? (this.stats.hits / totalRequests) * 100
      : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = JSON.stringify(
      Array.from(this.cache.entries()),
    ).length;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      costSaved: Math.round(this.stats.costSaved * 10000) / 10000,
      tokensSaved: this.stats.tokensSaved,
      memoryUsage,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      costSaved: 0,
      tokensSaved: 0,
    };
    this.logger.log('Cache statistics reset');
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    const entry = this.cache.get(lruKey);

    if (entry) {
      this.logger.debug(
        `Evicting LRU entry: ${entry.hits} hits, age=${Date.now() - entry.timestamp}ms`,
      );
    }

    this.cache.delete(lruKey);
    this.removeFromAccessOrder(lruKey);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttlMs) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 600000);
  }

  /**
   * Warm up cache with common queries (optional)
   */
  async warmUp(commonQueries: Array<{
    taskType: string;
    prompt: string;
    data: any;
    metadata: { cost: number; tokenUsage: number };
  }>): Promise<void> {
    for (const query of commonQueries) {
      this.set(
        query.taskType,
        query.prompt,
        query.data,
        query.metadata,
      );
    }
    this.logger.log(`Cache warmed up with ${commonQueries.length} entries`);
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStatistics();

    // Consider cache unhealthy if:
    // - Hit rate is very low after significant usage
    // - Memory usage is too high
    if (stats.totalHits + stats.totalMisses > 100 && stats.hitRate < 10) {
      this.logger.warn('Low cache hit rate detected');
      return false;
    }

    if (stats.memoryUsage > 50_000_000) { // 50MB
      this.logger.warn('High cache memory usage detected');
      return false;
    }

    return true;
  }
}
