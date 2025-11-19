import { ApiProperty } from '@nestjs/swagger';
import { ReferenceDisplayDto } from './dashboard-response.dto';

/**
 * Pagination metadata
 * Server-computed pagination info
 */
export class PaginationMetadataDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;

  @ApiProperty()
  nextPage: number | null;

  @ApiProperty()
  prevPage: number | null;
}

/**
 * Facets for filtering
 * Server computes available filters and counts
 */
export class FacetDto {
  @ApiProperty()
  field: string;

  @ApiProperty()
  values: Array<{
    value: string;
    count: number;
    label: string;
  }>;
}

/**
 * Server-side aggregations for library
 */
export class LibraryAggregationsDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  statusBreakdown: {
    pending: number;
    completed: number;
    declined: number;
    expired: number;
  };

  @ApiProperty()
  formatBreakdown: {
    video: number;
    audio: number;
    text: number;
  };

  @ApiProperty()
  averageRcsScore: number;

  @ApiProperty()
  rcsScoreDistribution: {
    excellent: number; // 90-100
    good: number; // 75-89
    average: number; // 60-74
    poor: number; // <60
  };

  @ApiProperty()
  topCompanies: Array<{
    name: string;
    count: number;
  }>;

  @ApiProperty()
  topRoles: Array<{
    name: string;
    count: number;
  }>;
}

/**
 * Complete library response with server-side filtering and pagination
 */
export class LibraryResponseDto {
  @ApiProperty({ type: [ReferenceDisplayDto] })
  items: ReferenceDisplayDto[];

  @ApiProperty({ type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;

  @ApiProperty({ type: LibraryAggregationsDto })
  aggregations: LibraryAggregationsDto;

  @ApiProperty({ type: [FacetDto] })
  facets: FacetDto[];

  @ApiProperty()
  appliedFilters: {
    status?: string[];
    format?: string[];
    rcsScoreMin?: number;
    rcsScoreMax?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  };
}

/**
 * Search result with relevance scoring
 */
export class SearchResultDto {
  @ApiProperty({ type: [ReferenceDisplayDto] })
  items: ReferenceDisplayDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  searchQuery: string;

  @ApiProperty()
  executionTime: number; // milliseconds

  @ApiProperty({ type: [FacetDto] })
  facets: FacetDto[];

  @ApiProperty()
  suggestions: string[]; // Did you mean...

  @ApiProperty()
  relatedSearches: string[];

  @ApiProperty({ type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;
}
