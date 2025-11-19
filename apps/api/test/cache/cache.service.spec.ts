/**
 * Cache Service Unit Tests
 *
 * Tests for CacheService functionality including:
 * - Basic CRUD operations
 * - Circuit breaker pattern
 * - Error handling
 * - TTL management
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../src/cache/cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;
  let configService: ConfigService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        CACHE_ENABLED: true,
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
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('get', () => {
    it('should return cached value on hit', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null on cache miss', async () => {
      const key = 'test:key';
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null on error', async () => {
      const key = 'test:key';
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null when cache is disabled', async () => {
      mockConfigService.get.mockReturnValue(false); // CACHE_ENABLED = false
      const newService = new CacheService(mockCacheManager, configService);

      const result = await newService.get('test:key');

      expect(result).toBeNull();
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value in cache with default TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      await service.set(key, value);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should set value in cache with custom TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 300;

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl * 1000);
    });

    it('should handle errors gracefully', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.set(key, value)).resolves.not.toThrow();
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      const key = 'test:key';

      await service.delete(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle errors gracefully', async () => {
      const key = 'test:key';
      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.delete(key)).resolves.not.toThrow();
      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test:key';
      const cachedValue = { data: 'cached' };
      const factory = jest.fn().mockResolvedValue({ data: 'new' });

      mockCacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should compute and cache value on miss', async () => {
      const key = 'test:key';
      const newValue = { data: 'new' };
      const factory = jest.fn().mockResolvedValue(newValue);
      const ttl = 300;

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.getOrSet(key, factory, ttl);

      expect(result).toEqual(newValue);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, newValue, ttl * 1000);
    });
  });

  describe('reset', () => {
    it('should reset cache', async () => {
      await service.reset();

      expect(mockCacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await service.getHealth();

      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('latency');
    });
  });
});
