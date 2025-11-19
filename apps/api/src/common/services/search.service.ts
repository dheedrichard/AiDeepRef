import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference } from '../../database/entities';
import { DataTransformerService } from './data-transformer.service';

export interface SearchFilters {
  status?: string[];
  format?: string[];
  rcsScoreMin?: number;
  rcsScoreMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: any[];
  total: number;
  executionTime: number;
  facets: any[];
  suggestions: string[];
  relatedSearches: string[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Search Service
 *
 * Purpose: Server-side full-text search with relevance scoring
 * Benefits:
 * - PostgreSQL full-text search (fast and efficient)
 * - Server-side filtering and sorting
 * - Relevance scoring and ranking
 * - Search suggestions and related searches
 * - No client-side processing required
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Reference)
    private readonly referenceRepo: Repository<Reference>,
    private readonly transformerService: DataTransformerService,
  ) {}

  /**
   * Server-side full-text search with relevance scoring
   * Uses PostgreSQL's built-in full-text search capabilities
   */
  async searchReferences(
    userId: string,
    query: string,
    filters: SearchFilters = {},
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Build query with full-text search
      const qb = this.referenceRepo
        .createQueryBuilder('ref')
        .where('ref.seekerId = :userId', { userId });

      // Full-text search on multiple fields
      if (query && query.trim().length > 0) {
        // PostgreSQL full-text search
        qb.andWhere(
          `(
            to_tsvector('english', ref.referrerName || ' ' || ref.company || ' ' || ref.role)
            @@ plainto_tsquery('english', :query)
          )`,
          { query: query.trim() },
        );
      }

      // Apply additional filters
      if (filters.status && filters.status.length > 0) {
        qb.andWhere('ref.status IN (:...status)', { status: filters.status });
      }

      if (filters.format && filters.format.length > 0) {
        qb.andWhere('ref.format IN (:...format)', { format: filters.format });
      }

      if (filters.rcsScoreMin !== undefined) {
        qb.andWhere('ref.rcsScore >= :min', { min: filters.rcsScoreMin });
      }

      if (filters.rcsScoreMax !== undefined) {
        qb.andWhere('ref.rcsScore <= :max', { max: filters.rcsScoreMax });
      }

      if (filters.dateFrom) {
        qb.andWhere('ref.createdAt >= :from', { from: filters.dateFrom });
      }

      if (filters.dateTo) {
        qb.andWhere('ref.createdAt <= :to', { to: filters.dateTo });
      }

      // Sort by relevance (if search query provided) or date
      if (query && query.trim().length > 0) {
        qb.orderBy(
          `ts_rank(
            to_tsvector('english', ref.referrerName || ' ' || ref.company || ' ' || ref.role),
            plainto_tsquery('english', :query)
          )`,
          'DESC',
        );
        qb.addOrderBy('ref.createdAt', 'DESC');
      } else {
        qb.orderBy('ref.createdAt', 'DESC');
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      qb.skip((page - 1) * limit).take(limit);

      // Execute query
      const [items, total] = await qb.getManyAndCount();

      // Transform items to display format
      const displayItems = items.map((item) =>
        this.transformerService.transformReferenceForDisplay(item),
      );

      // Compute facets for filtering UI
      const facets = await this.computeFacets(userId, query);

      // Generate search suggestions
      const suggestions = this.generateSearchSuggestions(query);

      // Get related searches
      const relatedSearches = await this.getRelatedSearches(userId, query);

      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Search completed in ${executionTime}ms - Query: "${query}", Results: ${total}`,
      );

      return {
        items: displayItems,
        total,
        executionTime,
        facets,
        suggestions,
        relatedSearches,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Error searching references: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(
    userId: string,
    criteria: {
      keywords?: string;
      company?: string;
      role?: string;
      status?: string[];
      format?: string[];
      rcsScoreRange?: { min: number; max: number };
      dateRange?: { from: Date; to: Date };
    },
    pagination: { page: number; limit: number },
  ): Promise<SearchResult> {
    const startTime = Date.now();

    const qb = this.referenceRepo
      .createQueryBuilder('ref')
      .where('ref.seekerId = :userId', { userId });

    // Keyword search
    if (criteria.keywords) {
      qb.andWhere(
        `to_tsvector('english', ref.referrerName || ' ' || ref.company || ' ' || ref.role) @@ plainto_tsquery('english', :keywords)`,
        { keywords: criteria.keywords },
      );
    }

    // Company filter
    if (criteria.company) {
      qb.andWhere('ref.company ILIKE :company', {
        company: `%${criteria.company}%`,
      });
    }

    // Role filter
    if (criteria.role) {
      qb.andWhere('ref.role ILIKE :role', { role: `%${criteria.role}%` });
    }

    // Status filter
    if (criteria.status && criteria.status.length > 0) {
      qb.andWhere('ref.status IN (:...status)', { status: criteria.status });
    }

    // Format filter
    if (criteria.format && criteria.format.length > 0) {
      qb.andWhere('ref.format IN (:...format)', { format: criteria.format });
    }

    // RCS score range
    if (criteria.rcsScoreRange) {
      qb.andWhere('ref.rcsScore BETWEEN :min AND :max', {
        min: criteria.rcsScoreRange.min,
        max: criteria.rcsScoreRange.max,
      });
    }

    // Date range
    if (criteria.dateRange) {
      qb.andWhere('ref.createdAt BETWEEN :from AND :to', {
        from: criteria.dateRange.from,
        to: criteria.dateRange.to,
      });
    }

    // Pagination
    qb.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);

    // Order by relevance
    qb.orderBy('ref.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();

    const executionTime = Date.now() - startTime;

    return {
      items: items.map((item) =>
        this.transformerService.transformReferenceForDisplay(item),
      ),
      total,
      executionTime,
      facets: [],
      suggestions: [],
      relatedSearches: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: pagination.page * pagination.limit < total,
        hasPrev: pagination.page > 1,
      },
    };
  }

  /**
   * Compute facets for filtering
   */
  private async computeFacets(userId: string, query: string): Promise<any[]> {
    // In production, compute actual facets from search results
    return [
      {
        field: 'status',
        label: 'Status',
        values: [
          { value: 'pending', label: 'Pending', count: 0 },
          { value: 'completed', label: 'Completed', count: 0 },
          { value: 'declined', label: 'Declined', count: 0 },
        ],
      },
      {
        field: 'format',
        label: 'Format',
        values: [
          { value: 'video', label: 'Video', count: 0 },
          { value: 'audio', label: 'Audio', count: 0 },
          { value: 'text', label: 'Text', count: 0 },
        ],
      },
    ];
  }

  /**
   * Generate search suggestions based on query
   */
  private generateSearchSuggestions(query: string): string[] {
    if (!query || query.trim().length === 0) return [];

    // Simple suggestion algorithm - in production, use ML or dictionary
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    // Common typos and corrections
    const corrections: Record<string, string> = {
      manger: 'manager',
      enginer: 'engineer',
      develper: 'developer',
      senoir: 'senior',
    };

    if (corrections[queryLower]) {
      suggestions.push(corrections[queryLower]);
    }

    return suggestions;
  }

  /**
   * Get related searches
   */
  private async getRelatedSearches(
    userId: string,
    query: string,
  ): Promise<string[]> {
    // In production, track user searches and suggest related ones
    // For now, return common related searches
    if (!query || query.trim().length === 0) return [];

    return [
      'senior developer',
      'project manager',
      'team lead',
      'software engineer',
    ].filter((search) => search !== query.toLowerCase());
  }
}
