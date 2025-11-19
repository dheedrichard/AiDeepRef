/**
 * @Cacheable Decorator
 *
 * Implements cache-aside pattern for method results.
 * Automatically generates cache keys from method name and arguments.
 *
 * Usage:
 * @Cacheable({ ttl: 300, key: 'user:profile' })
 * async getUserProfile(userId: string) { ... }
 */

import { CacheTTL } from '../cache.config';

export interface CacheableOptions {
  /**
   * Cache key prefix (e.g., 'user:profile')
   */
  key: string;

  /**
   * Time to live in seconds (default: 300)
   */
  ttl?: number;

  /**
   * Custom key generator function
   * If not provided, will use method arguments to generate key
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * Condition function to determine if value should be cached
   * Return false to skip caching
   */
  condition?: (result: any) => boolean;
}

/**
 * Metadata key for cacheable decorator
 */
export const CACHEABLE_METADATA = 'cacheable_metadata';

/**
 * Cacheable decorator implementation
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // Store metadata for potential inspection
    Reflect.defineMetadata(CACHEABLE_METADATA, options, target, propertyKey);

    descriptor.value = async function (...args: any[]) {
      // Get CacheService instance from class
      const cacheService = (this as any).cacheService;

      if (!cacheService) {
        console.warn(
          `CacheService not found in ${target.constructor.name}. Executing without cache.`,
        );
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = generateCacheKey(options, propertyKey.toString(), args);

      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check condition before caching
      if (options.condition && !options.condition(result)) {
        return result;
      }

      // Cache the result
      const ttl = options.ttl || CacheTTL.SHORT;
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Generate cache key from options and arguments
 */
function generateCacheKey(
  options: CacheableOptions,
  methodName: string,
  args: any[],
): string {
  if (options.keyGenerator) {
    return options.keyGenerator(...args);
  }

  // Default key generation: prefix:arg1:arg2:...
  const keyParts = [options.key];

  for (const arg of args) {
    if (arg === null || arg === undefined) {
      keyParts.push('null');
    } else if (typeof arg === 'object') {
      // For objects, use JSON stringify (be careful with circular refs)
      try {
        keyParts.push(JSON.stringify(arg));
      } catch {
        keyParts.push(String(arg));
      }
    } else {
      keyParts.push(String(arg));
    }
  }

  return keyParts.join(':');
}

/**
 * Helper function to create custom key generator
 */
export function createKeyGenerator(
  prefix: string,
  selector: (...args: any[]) => string[],
): (...args: any[]) => string {
  return (...args: any[]) => {
    const parts = selector(...args);
    return `${prefix}:${parts.join(':')}`;
  };
}
