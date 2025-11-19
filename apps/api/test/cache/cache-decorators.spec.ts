/**
 * Cache Decorators Unit Tests
 *
 * Tests for @Cacheable and @CacheInvalidate decorators
 */

import { CacheService } from '../../src/cache/cache.service';
import { Cacheable } from '../../src/cache/decorators/cacheable.decorator';
import { CacheInvalidate } from '../../src/cache/decorators/cache-invalidate.decorator';

describe('Cache Decorators', () => {
  let mockCacheService: Partial<CacheService>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
    };
  });

  describe('@Cacheable', () => {
    class TestService {
      constructor(public cacheService: CacheService) {}

      @Cacheable({ key: 'test', ttl: 300 })
      async getData(id: string): Promise<any> {
        return { id, data: 'fresh' };
      }
    }

    it('should return cached value on cache hit', async () => {
      const cachedValue = { id: '123', data: 'cached' };
      (mockCacheService.get as jest.Mock).mockResolvedValue(cachedValue);

      const service = new TestService(mockCacheService as CacheService);
      const result = await service.getData('123');

      expect(result).toEqual(cachedValue);
      expect(mockCacheService.get).toHaveBeenCalledWith('test:123');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should fetch and cache on cache miss', async () => {
      (mockCacheService.get as jest.Mock).mockResolvedValue(null);

      const service = new TestService(mockCacheService as CacheService);
      const result = await service.getData('123');

      expect(result).toEqual({ id: '123', data: 'fresh' });
      expect(mockCacheService.get).toHaveBeenCalledWith('test:123');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test:123',
        { id: '123', data: 'fresh' },
        300,
      );
    });

    it('should work without cacheService (graceful degradation)', async () => {
      class ServiceWithoutCache {
        @Cacheable({ key: 'test', ttl: 300 })
        async getData(id: string): Promise<any> {
          return { id, data: 'fresh' };
        }
      }

      const service = new ServiceWithoutCache();
      const result = await service.getData('123');

      expect(result).toEqual({ id: '123', data: 'fresh' });
    });
  });

  describe('@CacheInvalidate', () => {
    class TestService {
      constructor(public cacheService: CacheService) {}

      @CacheInvalidate({ keys: ['test:{0}'] })
      async updateData(id: string, data: any): Promise<any> {
        return { id, data };
      }

      @CacheInvalidate({ keys: ['test:*'] })
      async deleteAll(): Promise<void> {
        // Delete all
      }
    }

    it('should invalidate specific key after execution', async () => {
      const service = new TestService(mockCacheService as CacheService);
      await service.updateData('123', { value: 'new' });

      expect(mockCacheService.delete).toHaveBeenCalledWith('test:123');
    });

    it('should invalidate pattern after execution', async () => {
      const service = new TestService(mockCacheService as CacheService);
      await service.deleteAll();

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('test:*');
    });

    it('should work without cacheService (graceful degradation)', async () => {
      class ServiceWithoutCache {
        @CacheInvalidate({ keys: ['test:{0}'] })
        async updateData(id: string, data: any): Promise<any> {
          return { id, data };
        }
      }

      const service = new ServiceWithoutCache();
      const result = await service.updateData('123', { value: 'new' });

      expect(result).toEqual({ id: '123', data: { value: 'new' } });
    });
  });
});
