import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';

/**
 * Cache Control Interceptor
 *
 * Purpose: Add HTTP caching headers for optimal performance
 * Benefits:
 * - Reduce server load with browser caching
 * - ETags for conditional requests (304 Not Modified)
 * - Different cache strategies per route
 * - Bandwidth savings with 304 responses
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheControlInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap((data) => {
        // Only apply caching to GET requests
        if (request.method === 'GET') {
          this.applyCacheHeaders(request, response, data);
        } else {
          // Disable caching for non-GET requests
          response.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          );
          response.setHeader('Pragma', 'no-cache');
          response.setHeader('Expires', '0');
        }
      }),
    );
  }

  private applyCacheHeaders(request: any, response: any, data: any): void {
    const url = request.url;

    // Determine cache strategy based on route
    const cacheConfig = this.getCacheConfig(url);

    // Set Cache-Control header
    response.setHeader('Cache-Control', cacheConfig.cacheControl);

    // Generate and set ETag
    if (cacheConfig.useETag && data) {
      const etag = this.generateETag(data);
      response.setHeader('ETag', etag);

      // Check if client has matching ETag
      const clientETag = request.headers['if-none-match'];
      if (clientETag === etag) {
        this.logger.log(`ETag match for ${url} - Sending 304 Not Modified`);
        response.status(304).send();
        return;
      }
    }

    // Set Last-Modified header if applicable
    if (cacheConfig.useLastModified) {
      response.setHeader('Last-Modified', new Date().toUTCString());
    }

    // Set Vary header for conditional caching
    response.setHeader('Vary', 'Accept-Encoding, Authorization');
  }

  /**
   * Get cache configuration based on URL pattern
   */
  private getCacheConfig(url: string): {
    cacheControl: string;
    useETag: boolean;
    useLastModified: boolean;
  } {
    // Static assets - Cache for 1 year
    if (url.includes('/static/') || url.match(/\.(js|css|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$/)) {
      return {
        cacheControl: 'public, max-age=31536000, immutable',
        useETag: true,
        useLastModified: false,
      };
    }

    // Dashboard data - Cache for 5 minutes, private (user-specific)
    if (url.includes('/dashboard')) {
      return {
        cacheControl: 'private, max-age=300, must-revalidate',
        useETag: true,
        useLastModified: true,
      };
    }

    // BFF aggregated data - Cache for 5 minutes
    if (url.includes('/bff/')) {
      return {
        cacheControl: 'private, max-age=300, must-revalidate',
        useETag: true,
        useLastModified: true,
      };
    }

    // Library/list data - Cache for 2 minutes
    if (url.includes('/library') || url.includes('/list')) {
      return {
        cacheControl: 'private, max-age=120, must-revalidate',
        useETag: true,
        useLastModified: true,
      };
    }

    // Search results - Cache for 1 minute
    if (url.includes('/search')) {
      return {
        cacheControl: 'private, max-age=60, must-revalidate',
        useETag: true,
        useLastModified: false,
      };
    }

    // User profile - Cache for 10 minutes
    if (url.includes('/profile')) {
      return {
        cacheControl: 'private, max-age=600, must-revalidate',
        useETag: true,
        useLastModified: true,
      };
    }

    // References (individual) - Cache for 30 minutes
    if (url.match(/\/references\/[a-f0-9-]{36}$/)) {
      return {
        cacheControl: 'private, max-age=1800, must-revalidate',
        useETag: true,
        useLastModified: true,
      };
    }

    // Public/shared bundles - Cache for 1 hour
    if (url.includes('/bundles/public/') || url.includes('/bundles/shared/')) {
      return {
        cacheControl: 'public, max-age=3600, must-revalidate',
        useETag: true,
        useLastModified: true,
      };
    }

    // Default - No cache for dynamic content
    return {
      cacheControl: 'no-cache, must-revalidate',
      useETag: true,
      useLastModified: false,
    };
  }

  /**
   * Generate ETag from response data
   * Uses MD5 hash for fast generation
   */
  private generateETag(data: any): string {
    try {
      const content = typeof data === 'string' ? data : JSON.stringify(data);
      const hash = createHash('md5').update(content).digest('hex');
      return `"${hash}"`;
    } catch (error) {
      this.logger.error('Error generating ETag', error);
      // Fallback to timestamp-based ETag
      return `"${Date.now()}"`;
    }
  }
}
