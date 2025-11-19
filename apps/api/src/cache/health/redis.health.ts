/**
 * Redis Health Indicator
 *
 * Provides health check for Redis cache with:
 * - Connection status
 * - Latency monitoring
 * - Memory usage tracking
 */

import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { CacheMetricsService } from '../cache-metrics.service';
import { CacheService } from '../cache.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    private readonly cacheService: CacheService,
    private readonly metricsService: CacheMetricsService,
  ) {
    super();
  }

  /**
   * Check Redis health status
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.cacheService.getHealth();
      const cacheHealth = await this.metricsService.getHealth();

      const isHealthy = health.connected && cacheHealth.status !== 'unhealthy';

      const result = this.getStatus(key, isHealthy, {
        connected: health.connected,
        latency: health.latency,
        status: cacheHealth.status,
        memoryUsage: cacheHealth.memoryUsagePercentage.toFixed(2) + '%',
        memoryUsed: this.formatBytes(cacheHealth.memoryUsed),
        memoryMax: this.formatBytes(cacheHealth.memoryMax),
        keyCount: cacheHealth.keyCount,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Redis health check failed', result);
      }

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        error: error.message,
      });
      throw new HealthCheckError('Redis health check failed', result);
    }
  }

  /**
   * Check Redis with warning for degraded performance
   */
  async checkHealth(key: string): Promise<HealthIndicatorResult> {
    const health = await this.cacheService.getHealth();
    const cacheHealth = await this.metricsService.getHealth();

    const status = cacheHealth.status;

    return this.getStatus(key, health.connected, {
      connected: health.connected,
      latency: health.latency,
      status,
      memoryUsage: cacheHealth.memoryUsagePercentage.toFixed(2) + '%',
      memoryUsed: this.formatBytes(cacheHealth.memoryUsed),
      memoryMax: this.formatBytes(cacheHealth.memoryMax),
      keyCount: cacheHealth.keyCount,
      warning:
        status === 'degraded'
          ? 'Redis performance is degraded'
          : status === 'unhealthy'
            ? 'Redis is unhealthy'
            : undefined,
    });
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
