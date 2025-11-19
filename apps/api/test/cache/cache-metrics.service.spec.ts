/**
 * Cache Metrics Service Unit Tests
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheMetricsService } from '../../src/cache/cache-metrics.service';
import { CacheOperation } from '../../src/cache/interfaces/cache-metrics.interface';

describe('CacheMetricsService', () => {
  let service: CacheMetricsService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'test',
        REDIS_DB: 0,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheMetricsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheMetricsService>(CacheMetricsService);
  });

  describe('recordOperation', () => {
    it('should record cache hit operation', () => {
      const operation: CacheOperation = {
        type: 'get',
        key: 'test:key',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      };

      service.recordOperation(operation);

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
    });

    it('should record cache miss operation', () => {
      const operation: CacheOperation = {
        type: 'get',
        key: 'test:key',
        timestamp: Date.now(),
        latency: 10,
        hit: false,
      };

      service.recordOperation(operation);

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(1);
    });

    it('should record set operation', () => {
      const operation: CacheOperation = {
        type: 'set',
        key: 'test:key',
        timestamp: Date.now(),
        latency: 15,
      };

      service.recordOperation(operation);

      const metrics = service.getMetrics();
      expect(metrics.sets).toBe(1);
    });

    it('should record delete operation', () => {
      const operation: CacheOperation = {
        type: 'delete',
        key: 'test:key',
        timestamp: Date.now(),
        latency: 5,
      };

      service.recordOperation(operation);

      const metrics = service.getMetrics();
      expect(metrics.deletes).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      service.recordOperation({
        type: 'get',
        key: 'test:1',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      });

      service.recordOperation({
        type: 'get',
        key: 'test:2',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      });

      service.recordOperation({
        type: 'get',
        key: 'test:3',
        timestamp: Date.now(),
        latency: 10,
        hit: false,
      });

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate average latency', () => {
      service.recordOperation({
        type: 'get',
        key: 'test:1',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      });

      service.recordOperation({
        type: 'get',
        key: 'test:2',
        timestamp: Date.now(),
        latency: 20,
        hit: true,
      });

      service.recordOperation({
        type: 'get',
        key: 'test:3',
        timestamp: Date.now(),
        latency: 30,
        hit: false,
      });

      const metrics = service.getMetrics();
      expect(metrics.avgLatency).toBe(20);
    });
  });

  describe('getRecentOperations', () => {
    it('should return recent operations', () => {
      for (let i = 0; i < 10; i++) {
        service.recordOperation({
          type: 'get',
          key: `test:${i}`,
          timestamp: Date.now(),
          latency: 10,
          hit: true,
        });
      }

      const operations = service.getRecentOperations(5);
      expect(operations).toHaveLength(5);
    });
  });

  describe('getSlowOperations', () => {
    it('should return slow operations', () => {
      service.recordOperation({
        type: 'get',
        key: 'fast',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      });

      service.recordOperation({
        type: 'get',
        key: 'slow',
        timestamp: Date.now(),
        latency: 100,
        hit: true,
      });

      const slowOps = service.getSlowOperations(50);
      expect(slowOps).toHaveLength(1);
      expect(slowOps[0].key).toBe('slow');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      service.recordOperation({
        type: 'get',
        key: 'test',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      });

      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.sets).toBe(0);
      expect(metrics.deletes).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return metrics summary', () => {
      service.recordOperation({
        type: 'get',
        key: 'test',
        timestamp: Date.now(),
        latency: 10,
        hit: true,
      });

      const summary = service.getSummary();
      expect(summary).toContain('Hit Rate');
      expect(summary).toContain('Avg Latency');
    });
  });
});
