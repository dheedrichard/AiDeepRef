import { ApiProperty } from '@nestjs/swagger';
import { ReferenceFormat, ReferenceStatus } from '../../database/entities';

/**
 * Server-computed statistics
 * All calculations done on backend
 */
export class DashboardStatsDto {
  @ApiProperty({ example: 25 })
  totalReferences: number;

  @ApiProperty({ example: 5 })
  pendingRequests: number;

  @ApiProperty({ example: 18 })
  completedReferences: number;

  @ApiProperty({ example: 2 })
  declinedReferences: number;

  @ApiProperty({ example: 87.5 })
  averageRcsScore: number;

  @ApiProperty({ example: 92.3 })
  completionRate: number;

  @ApiProperty({ example: '3 days' })
  averageResponseTime: string;

  @ApiProperty({ example: 85 })
  percentile: number;
}

/**
 * Enriched reference display data
 * Server transforms DB model to UI-ready format
 */
export class ReferenceDisplayDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referrerName: string;

  @ApiProperty()
  company: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  submittedAt: string; // ISO string

  @ApiProperty({ example: '2 days ago' })
  relativeTime: string; // Server-computed

  @ApiProperty({ enum: ReferenceFormat })
  format: ReferenceFormat;

  @ApiProperty({ example: '5:42' })
  duration?: string; // Formatted duration

  @ApiProperty()
  rcsScore?: {
    overall: number;
    breakdown: {
      authenticity: number;
      relevance: number;
      clarity: number;
      sentiment: number;
    };
    percentile: number;
    badge: string; // "Excellent", "Good", "Average", "Poor"
  };

  @ApiProperty()
  status: {
    value: ReferenceStatus;
    label: string;
    color: string; // hex color
    icon: string; // icon name
  };

  @ApiProperty()
  actions: string[]; // Available actions based on state

  @ApiProperty()
  thumbnailUrl?: string;

  @ApiProperty()
  preview?: string; // Text preview or description
}

/**
 * Pending request with enriched data
 */
export class PendingRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referrerName: string;

  @ApiProperty()
  referrerEmail: string;

  @ApiProperty()
  company: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  requestedAt: string;

  @ApiProperty({ example: '5 days ago' })
  relativeTime: string;

  @ApiProperty({ example: '2 days' })
  timeRemaining: string;

  @ApiProperty({ example: 40 })
  expiryPercentage: number;

  @ApiProperty()
  status: {
    value: string;
    label: string;
    color: string;
  };
}

/**
 * Bundle summary
 */
export class BundleSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  referenceCount: number;

  @ApiProperty()
  averageRcsScore: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  sharedWith: number; // count of employers

  @ApiProperty()
  views: number;
}

/**
 * Notification with enriched context
 */
export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  relativeTime: string;

  @ApiProperty()
  read: boolean;

  @ApiProperty()
  actionUrl?: string;

  @ApiProperty()
  metadata?: Record<string, any>;
}

/**
 * AI-powered recommendations
 */
export class RecommendationDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  priority: 'high' | 'medium' | 'low';

  @ApiProperty()
  actionUrl?: string;

  @ApiProperty()
  actionLabel?: string;
}

/**
 * Trends and insights
 */
export class TrendsDto {
  @ApiProperty()
  period: string; // "7-day", "30-day"

  @ApiProperty()
  requestsChange: number; // percentage

  @ApiProperty()
  rcsScoreChange: number; // percentage

  @ApiProperty()
  completionRateChange: number; // percentage

  @ApiProperty()
  chartData: {
    labels: string[];
    values: number[];
  };
}

/**
 * Complete dashboard response - Single endpoint
 * Contains ALL data needed for dashboard rendering
 */
export class SeekerDashboardResponseDto {
  @ApiProperty({ type: DashboardStatsDto })
  stats: DashboardStatsDto;

  @ApiProperty({ type: [ReferenceDisplayDto] })
  recentReferences: ReferenceDisplayDto[];

  @ApiProperty({ type: [PendingRequestDto] })
  pendingRequests: PendingRequestDto[];

  @ApiProperty({ type: [BundleSummaryDto] })
  bundles: BundleSummaryDto[];

  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ type: [RecommendationDto] })
  recommendations: RecommendationDto[];

  @ApiProperty({ type: TrendsDto })
  trends: TrendsDto;

  @ApiProperty()
  metadata: {
    lastUpdated: string;
    dataFreshness: number; // seconds since last update
    quotaUsed: number;
    quotaLimit: number;
  };
}

/**
 * Referrer dashboard response
 */
export class ReferrerDashboardResponseDto {
  @ApiProperty()
  stats: {
    totalRequests: number;
    pendingRequests: number;
    completedReferences: number;
    averageCompletionTime: string;
  };

  @ApiProperty({ type: [PendingRequestDto] })
  pendingRequests: PendingRequestDto[];

  @ApiProperty({ type: [ReferenceDisplayDto] })
  completedReferences: ReferenceDisplayDto[];

  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ type: [RecommendationDto] })
  insights: RecommendationDto[];
}

/**
 * Employer dashboard response
 */
export class EmployerDashboardResponseDto {
  @ApiProperty()
  stats: {
    totalCandidates: number;
    referencesViewed: number;
    averageRcsScore: number;
  };

  @ApiProperty()
  recentlyViewed: any[];

  @ApiProperty()
  topCandidates: any[];

  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];
}
