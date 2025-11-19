/**
 * Cache Metrics Service
 *
 * Tracks cache performance metrics including:
 * - Hit/miss rates
 * - Operation latencies
 * - Error rates
 * - Memory usage
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheHealth, CacheMetrics, CacheOperation } from './interfaces/cache-metrics.interface';

@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger(CacheMetricsService.name);
  private redis: Redis | null = null;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    avgLatency: 0,
  };
  private operations: CacheOperation[] = [];
  private readonly maxOperationsHistory = 1000;

  constructor(private configService: ConfigService) {
    this.initializeRedisClient();
  }

  /**
   * Initialize Redis client for metrics collection
   */
  private initializeRedisClient() {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        lazyConnect: true,
      });

      this.redis.connect().catch((err) => {
        this.logger.warn('Metrics Redis client connection failed:', err.message);
      });
    } catch (error) {
      this.logger.warn('Metrics Redis client initialization failed:', error.message);
    }
  }

  /**
   * Record a cache operation
   */
  recordOperation(operation: CacheOperation): void {
    this.operations.push(operation);

    // Keep only recent operations
    if (this.operations.length > this.maxOperationsHistory) {
      this.operations.shift();
    }

    // Update metrics
    switch (operation.type) {
      case 'get':
        if (operation.hit) {
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
        break;
      case 'set':
        this.metrics.sets++;
        break;
      case 'delete':
        this.metrics.deletes++;
        break;
    }

    if (operation.error) {
      this.metrics.errors++;
    }

    // Calculate hit rate
    const totalReads = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalReads > 0 ? this.metrics.hits / totalReads : 0;

    // Calculate average latency
    const latencies = this.operations
      .filter((op) => !op.error)
      .map((op) => op.latency);
    this.metrics.avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent operations
   */
  getRecentOperations(limit: number = 100): CacheOperation[] {
    return this.operations.slice(-limit);
  }

  /**
   * Get slow operations (> threshold)
   */
  getSlowOperations(thresholdMs: number = 50): CacheOperation[] {
    return this.operations.filter((op) => op.latency > thresholdMs);
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<CacheHealth> {
    if (!this.redis) {
      return {
        connected: false,
        latency: -1,
        memoryUsed: 0,
        memoryMax: 0,
        memoryUsagePercentage: 0,
        keyCount: 0,
        status: 'unhealthy',
      };
    }

    try {
      const startTime = Date.now();
      await this.redis.ping();
      const latency = Date.now() - startTime;

      // Get memory info
      const info = await this.redis.info('memory');
      const memoryLines = info.split('\r\n');
      const memoryUsedLine = memoryLines.find((line) =>
        line.startsWith('used_memory:'),
      );
      const memoryMaxLine = memoryLines.find((line) =>
        line.startsWith('maxmemory:'),
      );

      const memoryUsed = memoryUsedLine
        ? parseInt(memoryUsedLine.split(':')[1], 10)
        : 0;
      const memoryMax = memoryMaxLine
        ? parseInt(memoryMaxLine.split(':')[1], 10)
        : 0;

      const memoryUsagePercentage =
        memoryMax > 0 ? (memoryUsed / memoryMax) * 100 : 0;

      // Get key count
      const dbInfo = await this.redis.info('keyspace');
      const db0Line = dbInfo.split('\r\n').find((line) => line.startsWith('db0:'));
      const keyCount = db0Line
        ? parseInt(db0Line.match(/keys=(\d+)/)?.[1] || '0', 10)
        : 0;

      // Determine status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (latency > 100 || memoryUsagePercentage > 90) {
        status = 'degraded';
      }
      if (latency > 500 || memoryUsagePercentage > 95) {
        status = 'unhealthy';
      }

      return {
        connected: true,
        latency,
        memoryUsed,
        memoryMax,
        memoryUsagePercentage,
        keyCount,
        status,
      };
    } catch (error) {
      this.logger.error('Failed to get cache health:', error.message);
      return {
        connected: false,
        latency: -1,
        memoryUsed: 0,
        memoryMax: 0,
        memoryUsagePercentage: 0,
        keyCount: 0,
        status: 'unhealthy',
      };
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgLatency: 0,
    };
    this.operations = [];
    this.logger.log('Cache metrics reset');
  }

  /**
   * Get metrics summary for logging/monitoring
   */
  getSummary(): string {
    return `Cache Metrics - Hit Rate: ${(this.metrics.hitRate * 100).toFixed(2)}%, ` +
      `Avg Latency: ${this.metrics.avgLatency.toFixed(2)}ms, ` +
      `Hits: ${this.metrics.hits}, Misses: ${this.metrics.misses}, ` +
      `Sets: ${this.metrics.sets}, Errors: ${this.metrics.errors}`;
  }

  /**
   * Log metrics summary (called periodically)
   */
  logSummary(): void {
    this.logger.log(this.getSummary());
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Metrics Redis client disconnected');
    }
  }
}
