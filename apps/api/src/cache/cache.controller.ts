/**
 * Cache Controller
 *
 * Provides endpoints for cache management and monitoring:
 * - Metrics and statistics
 * - Health status
 * - Manual cache warming
 * - Cache invalidation
 */

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CacheMetricsService } from './cache-metrics.service';
import { CacheService } from './cache.service';
import { CacheWarmingService } from './jobs/cache-warming.service';

/**
 * Note: In production, these endpoints should be protected by authentication
 * and authorization guards. Only admins should access cache management endpoints.
 */
@ApiTags('Cache')
@Controller('cache')
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly metricsService: CacheMetricsService,
    private readonly warmingService: CacheWarmingService,
  ) {}

  /**
   * Get cache metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get cache performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Cache metrics retrieved successfully',
  })
  async getMetrics() {
    const metrics = this.metricsService.getMetrics();
    const summary = this.metricsService.getSummary();

    return {
      metrics,
      summary,
    };
  }

  /**
   * Get cache health
   */
  @Get('health')
  @ApiOperation({ summary: 'Get cache health status' })
  @ApiResponse({ status: 200, description: 'Cache health retrieved successfully' })
  async getHealth() {
    const health = await this.metricsService.getHealth();
    return health;
  }

  /**
   * Get recent cache operations
   */
  @Get('operations')
  @ApiOperation({ summary: 'Get recent cache operations' })
  @ApiResponse({
    status: 200,
    description: 'Recent operations retrieved successfully',
  })
  async getRecentOperations() {
    const operations = this.metricsService.getRecentOperations(100);
    return operations;
  }

  /**
   * Get slow cache operations
   */
  @Get('operations/slow')
  @ApiOperation({ summary: 'Get slow cache operations (>50ms)' })
  @ApiResponse({
    status: 200,
    description: 'Slow operations retrieved successfully',
  })
  async getSlowOperations() {
    const slowOps = this.metricsService.getSlowOperations(50);
    return slowOps;
  }

  /**
   * Get cache warming queue statistics
   */
  @Get('warming/stats')
  @ApiOperation({ summary: 'Get cache warming queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getWarmingStats() {
    const stats = await this.warmingService.getQueueStats();
    return stats;
  }

  /**
   * Manually trigger cache warming
   */
  @Post('warming/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger cache warming' })
  @ApiResponse({ status: 202, description: 'Cache warming triggered' })
  async triggerWarming() {
    await this.warmingService.warmCache([
      'bundles',
      'ai-prompts',
      'popular-users',
    ]);
    return { message: 'Cache warming triggered successfully' };
  }

  /**
   * Warm specific bundle
   */
  @Post('warming/bundle/:bundleId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Warm specific bundle cache' })
  @ApiResponse({ status: 202, description: 'Bundle cache warming triggered' })
  async warmBundle(@Param('bundleId') bundleId: string) {
    await this.warmingService.warmBundle(bundleId);
    return { message: `Bundle ${bundleId} cache warming triggered` };
  }

  /**
   * Warm specific user
   */
  @Post('warming/user/:userId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Warm specific user cache' })
  @ApiResponse({ status: 202, description: 'User cache warming triggered' })
  async warmUser(@Param('userId') userId: string) {
    await this.warmingService.warmUser(userId);
    return { message: `User ${userId} cache warming triggered` };
  }

  /**
   * Invalidate cache by pattern
   */
  @Delete('invalidate/:pattern')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate cache by pattern' })
  @ApiResponse({ status: 204, description: 'Cache invalidated successfully' })
  async invalidatePattern(@Param('pattern') pattern: string) {
    // Replace URL-safe characters back
    const decodedPattern = pattern.replace(/__/g, ':').replace(/_\*/g, '*');
    await this.cacheService.deletePattern(decodedPattern);
  }

  /**
   * Reset all cache metrics
   */
  @Post('metrics/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset cache metrics' })
  @ApiResponse({ status: 204, description: 'Metrics reset successfully' })
  async resetMetrics() {
    this.metricsService.resetMetrics();
  }

  /**
   * Clear cache warming queue
   */
  @Delete('warming/queue')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear cache warming queue' })
  @ApiResponse({ status: 204, description: 'Queue cleared successfully' })
  async clearWarmingQueue() {
    await this.warmingService.clearQueue();
  }
}
