import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export interface CursorPaginationOptions {
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Pagination Service
 *
 * Purpose: Server-side pagination with cursor and offset support
 * Benefits:
 * - Efficient database queries
 * - Cursor-based pagination for real-time data
 * - Offset-based pagination for traditional use cases
 * - Automatic total count caching
 */
@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);
  private readonly countCache = new Map<string, { count: number; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Server-side offset-based pagination
   * Good for traditional pagination (page 1, 2, 3...)
   */
  async paginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<T>> {
    const startTime = Date.now();
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 per page

    try {
      // Apply sorting
      if (options.sortBy) {
        const alias = queryBuilder.alias;
        queryBuilder.orderBy(
          `${alias}.${options.sortBy}`,
          options.sortOrder || 'DESC',
        );
      }

      // Get total count (with caching)
      const cacheKey = this.getCacheKey(queryBuilder);
      const cachedCount = this.getCachedCount(cacheKey);
      const total =
        cachedCount !== null ? cachedCount : await queryBuilder.getCount();

      if (cachedCount === null) {
        this.setCachedCount(cacheKey, total);
      }

      // Apply pagination
      const items = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const totalPages = Math.ceil(total / limit);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Pagination executed in ${executionTime}ms - Page ${page}/${totalPages}, ${items.length} items`,
      );

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      };
    } catch (error) {
      this.logger.error(`Pagination error: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Server-side cursor-based pagination
   * Good for real-time feeds and infinite scroll
   */
  async paginateCursor<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: CursorPaginationOptions,
    cursorField: string = 'id',
  ): Promise<PaginatedResponse<T>> {
    const startTime = Date.now();
    const limit = Math.min(options.limit || 20, 100);

    try {
      const alias = queryBuilder.alias;

      // Decode cursor
      if (options.cursor) {
        const cursorValue = this.decodeCursor(options.cursor);
        const operator = options.sortOrder === 'ASC' ? '>' : '<';
        queryBuilder.andWhere(`${alias}.${cursorField} ${operator} :cursor`, {
          cursor: cursorValue,
        });
      }

      // Apply sorting
      const sortBy = options.sortBy || cursorField;
      queryBuilder.orderBy(
        `${alias}.${sortBy}`,
        options.sortOrder || 'DESC',
      );

      // Fetch one extra item to determine if there's a next page
      const items = await queryBuilder.take(limit + 1).getMany();

      const hasNext = items.length > limit;
      if (hasNext) {
        items.pop(); // Remove the extra item
      }

      // Generate next and previous cursors
      const nextCursor =
        hasNext && items.length > 0
          ? this.encodeCursor(items[items.length - 1][cursorField])
          : undefined;
      const prevCursor = options.cursor || undefined;

      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Cursor pagination executed in ${executionTime}ms - ${items.length} items`,
      );

      return {
        items,
        pagination: {
          page: 1, // Not applicable for cursor pagination
          limit,
          total: -1, // Not calculated for cursor pagination
          totalPages: -1,
          hasNext,
          hasPrev: !!options.cursor,
          nextPage: null,
          prevPage: null,
          nextCursor,
          prevCursor,
        },
      };
    } catch (error) {
      this.logger.error(`Cursor pagination error: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Paginate with custom count query
   * Useful when count query is expensive and needs optimization
   */
  async paginateWithCustomCount<T>(
    queryBuilder: SelectQueryBuilder<T>,
    countQuery: () => Promise<number>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<T>> {
    const startTime = Date.now();
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);

    try {
      // Apply sorting
      if (options.sortBy) {
        const alias = queryBuilder.alias;
        queryBuilder.orderBy(
          `${alias}.${options.sortBy}`,
          options.sortOrder || 'DESC',
        );
      }

      // Execute both queries in parallel
      const [items, total] = await Promise.all([
        queryBuilder
          .skip((page - 1) * limit)
          .take(limit)
          .getMany(),
        countQuery(),
      ]);

      const totalPages = Math.ceil(total / limit);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Custom count pagination executed in ${executionTime}ms`,
      );

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      };
    } catch (error) {
      this.logger.error(`Custom count pagination error: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Clear pagination count cache
   */
  clearCache(): void {
    this.countCache.clear();
    this.logger.log('Pagination cache cleared');
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: string): void {
    this.countCache.delete(key);
  }

  // Private helper methods

  private getCacheKey(queryBuilder: SelectQueryBuilder<any>): string {
    const [query, parameters] = queryBuilder.getQueryAndParameters();
    return `${query}_${JSON.stringify(parameters)}`;
  }

  private getCachedCount(key: string): number | null {
    const cached = this.countCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.countCache.delete(key);
      return null;
    }

    return cached.count;
  }

  private setCachedCount(key: string, count: number): void {
    this.countCache.set(key, { count, timestamp: Date.now() });
  }

  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  private decodeCursor(cursor: string): any {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  }
}
