/**
 * @CacheInvalidate Decorator
 *
 * Implements write-through pattern by invalidating cache after method execution.
 * Supports pattern-based invalidation for related keys.
 *
 * Usage:
 * @CacheInvalidate({ keys: ['user:profile:*', 'user:permissions:*'] })
 * async updateUserProfile(userId: string, data: any) { ... }
 */

export interface CacheInvalidateOptions {
  /**
   * Cache keys or patterns to invalidate
   * Supports wildcards: 'user:*', 'user:profile:123'
   */
  keys: string[];

  /**
   * Custom key generator function
   * Receives method arguments and returns keys to invalidate
   */
  keyGenerator?: (...args: any[]) => string[];

  /**
   * Condition function to determine if cache should be invalidated
   * Return false to skip invalidation
   */
  condition?: (result: any) => boolean;

  /**
   * When to invalidate: 'after' (default) or 'before'
   */
  when?: 'before' | 'after';
}

/**
 * Metadata key for cache invalidate decorator
 */
export const CACHE_INVALIDATE_METADATA = 'cache_invalidate_metadata';

/**
 * CacheInvalidate decorator implementation
 */
export function CacheInvalidate(
  options: CacheInvalidateOptions,
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // Store metadata for potential inspection
    Reflect.defineMetadata(
      CACHE_INVALIDATE_METADATA,
      options,
      target,
      propertyKey,
    );

    descriptor.value = async function (...args: any[]) {
      // Get CacheService instance from class
      const cacheService = (this as any).cacheService;

      if (!cacheService) {
        console.warn(
          `CacheService not found in ${target.constructor.name}. Executing without cache invalidation.`,
        );
        return originalMethod.apply(this, args);
      }

      // Invalidate before method execution
      if (options.when === 'before') {
        await invalidateCache(cacheService, options, args);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Invalidate after method execution (default)
      if (options.when !== 'before') {
        // Check condition before invalidating
        if (!options.condition || options.condition(result)) {
          await invalidateCache(cacheService, options, args, result);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Invalidate cache keys
 */
async function invalidateCache(
  cacheService: any,
  options: CacheInvalidateOptions,
  args: any[],
  result?: any,
): Promise<void> {
  try {
    // Generate keys to invalidate
    let keysToInvalidate: string[];

    if (options.keyGenerator) {
      keysToInvalidate = options.keyGenerator(...args);
    } else {
      keysToInvalidate = options.keys.map((key) => interpolateKey(key, args));
    }

    // Invalidate each key or pattern
    for (const key of keysToInvalidate) {
      if (key.includes('*')) {
        // Pattern-based invalidation
        await cacheService.deletePattern(key);
      } else {
        // Exact key invalidation
        await cacheService.delete(key);
      }
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Interpolate key with arguments
 * Example: 'user:profile:{0}' with args ['123'] => 'user:profile:123'
 */
function interpolateKey(key: string, args: any[]): string {
  return key.replace(/\{(\d+)\}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    if (argIndex < args.length) {
      return String(args[argIndex]);
    }
    return match;
  });
}

/**
 * Helper function to create custom key generator for invalidation
 */
export function createInvalidationKeyGenerator(
  template: ((...args: any[]) => string)[],
): (...args: any[]) => string[] {
  return (...args: any[]) => {
    return template.map((fn) => fn(...args));
  };
}
