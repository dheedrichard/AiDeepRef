import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SeekerAggregationService } from '../services/seeker-aggregation.service';
import {
  SeekerDashboardResponseDto,
  LibraryResponseDto,
  LibraryFiltersDto,
} from '../dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference } from '../../database/entities';

/**
 * Seeker BFF Controller
 *
 * Purpose: Provide aggregated endpoints for seeker dashboard
 * Benefits:
 * - Single endpoint returns ALL dashboard data (reduces 5+ API calls to 1)
 * - Server-side parallel data fetching
 * - Server-side data enrichment and computation
 * - Reduced network latency and client-side complexity
 */
@ApiTags('bff')
@Controller('bff/seeker')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SeekerBffController {
  private readonly logger = new Logger(SeekerBffController.name);

  constructor(
    private readonly aggregationService: SeekerAggregationService,
    @InjectRepository(Reference)
    private readonly referenceRepo: Repository<Reference>,
  ) {}

  /**
   * Get complete dashboard data in single request
   *
   * BEFORE: Client makes 5+ separate API calls:
   * - GET /api/references/stats
   * - GET /api/references/recent
   * - GET /api/references/pending
   * - GET /api/bundles
   * - GET /api/notifications
   *
   * AFTER: Single API call returns everything
   * - GET /api/bff/seeker/dashboard
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get complete seeker dashboard data',
    description:
      'Returns all dashboard data in single response: stats, recent references, pending requests, bundles, notifications, and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: SeekerDashboardResponseDto,
  })
  async getDashboard(@Req() req): Promise<SeekerDashboardResponseDto> {
    const userId = req.user.id;
    this.logger.log(`Fetching dashboard data for seeker ${userId}`);

    const startTime = Date.now();
    const dashboard = await this.aggregationService.getDashboardData(userId);
    const executionTime = Date.now() - startTime;

    this.logger.log(
      `Dashboard data fetched in ${executionTime}ms (replaced 5+ API calls)`,
    );

    return dashboard;
  }

  /**
   * Get library with server-side filtering and pagination
   *
   * BEFORE: Client fetches all data and filters/sorts/paginates locally
   * AFTER: Server handles all filtering, sorting, pagination, and aggregations
   */
  @Get('library')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get reference library with server-side filtering',
    description:
      'Returns filtered, sorted, and paginated reference library with aggregations',
  })
  @ApiResponse({
    status: 200,
    description: 'Library data retrieved successfully',
    type: LibraryResponseDto,
  })
  async getLibrary(
    @Req() req,
    @Query() filters: LibraryFiltersDto,
  ): Promise<LibraryResponseDto> {
    const userId = req.user.id;
    this.logger.log(
      `Fetching library for seeker ${userId} with filters: ${JSON.stringify(filters)}`,
    );

    const startTime = Date.now();

    // Build query with server-side filtering
    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .where('ref.seekerId = :userId', { userId });

    // Apply filters on server
    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere('ref.status IN (:...status)', {
        status: filters.status,
      });
    }

    if (filters.format && filters.format.length > 0) {
      queryBuilder.andWhere('ref.format IN (:...format)', {
        format: filters.format,
      });
    }

    if (filters.rcsScoreMin !== undefined) {
      queryBuilder.andWhere('ref.rcsScore >= :min', { min: filters.rcsScoreMin });
    }

    if (filters.rcsScoreMax !== undefined) {
      queryBuilder.andWhere('ref.rcsScore <= :max', { max: filters.rcsScoreMax });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('ref.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('ref.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(ref.referrerName ILIKE :search OR ref.company ILIKE :search OR ref.role ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.company) {
      queryBuilder.andWhere('ref.company ILIKE :company', {
        company: `%${filters.company}%`,
      });
    }

    if (filters.role) {
      queryBuilder.andWhere('ref.role ILIKE :role', {
        role: `%${filters.role}%`,
      });
    }

    // Server-side sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    queryBuilder.orderBy(`ref.${sortBy}`, sortOrder);

    // Server-side pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    // Execute query
    const [items, total] = await queryBuilder.getManyAndCount();

    // Server-side aggregations
    const allRefsQuery = this.referenceRepo
      .createQueryBuilder('ref')
      .where('ref.seekerId = :userId', { userId });

    const allRefs = await allRefsQuery.getMany();

    const aggregations = {
      totalCount: total,
      statusBreakdown: {
        pending: allRefs.filter((r) => r.status === 'pending').length,
        completed: allRefs.filter((r) => r.status === 'completed').length,
        declined: allRefs.filter((r) => r.status === 'declined').length,
        expired: allRefs.filter((r) => r.status === 'expired').length,
      },
      formatBreakdown: {
        video: allRefs.filter((r) => r.format === 'video').length,
        audio: allRefs.filter((r) => r.format === 'audio').length,
        text: allRefs.filter((r) => r.format === 'text').length,
      },
      averageRcsScore:
        allRefs.filter((r) => r.rcsScore !== null).length > 0
          ? allRefs
              .filter((r) => r.rcsScore !== null)
              .reduce((sum, r) => sum + (r.rcsScore || 0), 0) /
            allRefs.filter((r) => r.rcsScore !== null).length
          : 0,
      rcsScoreDistribution: {
        excellent: allRefs.filter((r) => r.rcsScore && r.rcsScore >= 90).length,
        good: allRefs.filter(
          (r) => r.rcsScore && r.rcsScore >= 75 && r.rcsScore < 90,
        ).length,
        average: allRefs.filter(
          (r) => r.rcsScore && r.rcsScore >= 60 && r.rcsScore < 75,
        ).length,
        poor: allRefs.filter((r) => r.rcsScore && r.rcsScore < 60).length,
      },
      topCompanies: this.getTopValues(allRefs.map((r) => r.company), 5),
      topRoles: this.getTopValues(allRefs.map((r) => r.role), 5),
    };

    // Build facets
    const facets = [
      {
        field: 'status',
        values: [
          {
            value: 'pending',
            count: aggregations.statusBreakdown.pending,
            label: 'Pending',
          },
          {
            value: 'completed',
            count: aggregations.statusBreakdown.completed,
            label: 'Completed',
          },
          {
            value: 'declined',
            count: aggregations.statusBreakdown.declined,
            label: 'Declined',
          },
          {
            value: 'expired',
            count: aggregations.statusBreakdown.expired,
            label: 'Expired',
          },
        ],
      },
      {
        field: 'format',
        values: [
          {
            value: 'video',
            count: aggregations.formatBreakdown.video,
            label: 'Video',
          },
          {
            value: 'audio',
            count: aggregations.formatBreakdown.audio,
            label: 'Audio',
          },
          { value: 'text', count: aggregations.formatBreakdown.text, label: 'Text' },
        ],
      },
    ];

    // Transform items to display format (server-side transformation)
    const displayItems = items.map((ref) =>
      this.transformReferenceForDisplay(ref),
    );

    const executionTime = Date.now() - startTime;
    this.logger.log(
      `Library fetched and processed in ${executionTime}ms (server-side filtering, sorting, pagination)`,
    );

    return {
      items: displayItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
        nextPage: page * limit < total ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
      aggregations,
      facets,
      appliedFilters: {
        status: filters.status,
        format: filters.format,
        rcsScoreMin: filters.rcsScoreMin,
        rcsScoreMax: filters.rcsScoreMax,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    };
  }

  // Helper method to transform reference for display
  private transformReferenceForDisplay(reference: Reference): any {
    return {
      id: reference.id,
      referrerName: reference.referrerName,
      company: reference.company,
      role: reference.role,
      submittedAt: reference.submittedAt
        ? reference.submittedAt.toISOString()
        : reference.createdAt.toISOString(),
      relativeTime: this.getRelativeTime(
        reference.submittedAt || reference.createdAt,
      ),
      format: reference.format || 'text',
      rcsScore: reference.rcsScore
        ? {
            overall: reference.rcsScore,
            breakdown: {
              authenticity: reference.aiAuthenticityScore || 0,
              relevance: 0,
              clarity: 0,
              sentiment: 0,
            },
            percentile: Math.min(
              100,
              Math.max(0, Math.round((reference.rcsScore / 100) * 100)),
            ),
            badge:
              reference.rcsScore >= 90
                ? 'Excellent'
                : reference.rcsScore >= 75
                  ? 'Good'
                  : reference.rcsScore >= 60
                    ? 'Average'
                    : 'Needs Improvement',
          }
        : undefined,
      status: {
        value: reference.status,
        label: this.getStatusLabel(reference.status),
        color: this.getStatusColor(reference.status),
        icon: this.getStatusIcon(reference.status),
      },
      actions: this.getAvailableActions(reference),
    };
  }

  private getTopValues(
    values: string[],
    limit: number,
  ): Array<{ name: string; count: number }> {
    const counts = values.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      completed: 'Completed',
      declined: 'Declined',
      expired: 'Expired',
    };
    return labels[status] || status;
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#FFA500',
      completed: '#28A745',
      declined: '#DC3545',
      expired: '#6C757D',
    };
    return colors[status] || '#6C757D';
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'clock',
      completed: 'check-circle',
      declined: 'x-circle',
      expired: 'alert-circle',
    };
    return icons[status] || 'circle';
  }

  private getAvailableActions(reference: Reference): string[] {
    const actions: string[] = ['view', 'download'];

    if (reference.status === 'completed') {
      actions.push('share', 'add-to-bundle');
    }

    if (reference.status === 'pending') {
      actions.push('remind', 'cancel');
    }

    return actions;
  }
}
