/**
 * Cache Warming Service
 *
 * Proactively loads frequently accessed data into cache to improve performance.
 * Uses Bull queue for scheduled cache warming jobs.
 */

import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';

export interface CacheWarmingJob {
  type: 'startup' | 'scheduled' | 'manual';
  targets: string[];
  priority?: number;
}

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectQueue('cache-warming') private readonly cacheWarmingQueue: Queue,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>(
      'CACHE_WARMING_ENABLED',
      true,
    );
  }

  /**
   * Initialize cache warming on module startup
   */
  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Cache warming is disabled');
      return;
    }

    this.logger.log('Initializing cache warming service');

    // Schedule startup cache warming
    await this.scheduleStartupWarming();

    // Schedule periodic cache warming
    await this.schedulePeriodicWarming();
  }

  /**
   * Warm cache on application startup
   */
  private async scheduleStartupWarming() {
    try {
      await this.cacheWarmingQueue.add(
        'startup-warming',
        {
          type: 'startup',
          targets: ['bundles', 'ai-prompts', 'popular-users'],
          priority: 10,
        } as CacheWarmingJob,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log('Scheduled startup cache warming');
    } catch (error) {
      this.logger.error('Failed to schedule startup warming:', error.message);
    }
  }

  /**
   * Schedule periodic cache warming (every 15 minutes)
   */
  private async schedulePeriodicWarming() {
    try {
      await this.cacheWarmingQueue.add(
        'periodic-warming',
        {
          type: 'scheduled',
          targets: ['hot-bundles', 'active-ai-prompts'],
          priority: 5,
        } as CacheWarmingJob,
        {
          repeat: {
            every: 15 * 60 * 1000, // 15 minutes
          },
          attempts: 2,
          removeOnComplete: true,
        },
      );

      this.logger.log('Scheduled periodic cache warming (every 15 minutes)');
    } catch (error) {
      this.logger.error('Failed to schedule periodic warming:', error.message);
    }
  }

  /**
   * Manually trigger cache warming for specific targets
   */
  async warmCache(targets: string[]): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Cache warming is disabled');
      return;
    }

    try {
      await this.cacheWarmingQueue.add(
        'manual-warming',
        {
          type: 'manual',
          targets,
          priority: 8,
        } as CacheWarmingJob,
        {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 1000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(`Manual cache warming triggered for: ${targets.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to trigger manual warming:', error.message);
      throw error;
    }
  }

  /**
   * Warm specific bundle cache
   */
  async warmBundle(bundleId: string): Promise<void> {
    await this.warmCache([`bundle:${bundleId}`]);
  }

  /**
   * Warm specific user cache
   */
  async warmUser(userId: string): Promise<void> {
    await this.warmCache([`user:${userId}`]);
  }

  /**
   * Warm AI prompts cache
   */
  async warmAIPrompts(): Promise<void> {
    await this.warmCache(['ai-prompts']);
  }

  /**
   * Get cache warming queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.cacheWarmingQueue.getWaitingCount(),
      this.cacheWarmingQueue.getActiveCount(),
      this.cacheWarmingQueue.getCompletedCount(),
      this.cacheWarmingQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Clear all cache warming jobs
   */
  async clearQueue(): Promise<void> {
    await this.cacheWarmingQueue.clean(0, 'completed');
    await this.cacheWarmingQueue.clean(0, 'failed');
    this.logger.log('Cache warming queue cleared');
  }
}
