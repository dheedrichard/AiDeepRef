/**
 * Cache Module
 *
 * Provides Redis caching functionality with:
 * - Connection pooling and retry logic
 * - Metrics collection
 * - Health monitoring
 * - Cache warming via Bull queues
 */

import { BullModule } from '@nestjs/bull';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheMetricsService } from './cache-metrics.service';
import { cacheConfig } from './cache.config';
import { CacheService } from './cache.service';
import { CacheWarmingProcessor } from './jobs/cache-warming.processor';
import { CacheWarmingService } from './jobs/cache-warming.service';

@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync(cacheConfig),
    BullModule.registerQueue({
      name: 'cache-warming',
    }),
  ],
  controllers: [],
  providers: [
    CacheService,
    CacheMetricsService,
    CacheWarmingService,
    CacheWarmingProcessor,
  ],
  exports: [CacheService, CacheMetricsService, CacheWarmingService],
})
export class CacheModule {}
