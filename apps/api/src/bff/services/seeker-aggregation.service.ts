import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference, User, Bundle } from '../../database/entities';
import {
  SeekerDashboardResponseDto,
  DashboardStatsDto,
  ReferenceDisplayDto,
  PendingRequestDto,
  BundleSummaryDto,
  NotificationDto,
  RecommendationDto,
  TrendsDto,
} from '../dto';

/**
 * Seeker Aggregation Service
 *
 * Purpose: Consolidate multiple data sources into single API responses
 * Benefits:
 * - Reduces client-server round trips from 5+ to 1
 * - Server-side parallel data fetching
 * - Server-side data computation and enrichment
 * - Consistent data format across all endpoints
 */
@Injectable()
export class SeekerAggregationService {
  private readonly logger = new Logger(SeekerAggregationService.name);

  constructor(
    @InjectRepository(Reference)
    private readonly referenceRepo: Repository<Reference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Bundle)
    private readonly bundleRepo: Repository<Bundle>,
  ) {}

  /**
   * Aggregate complete dashboard data in single call
   * Client receives ALL dashboard data in one response
   */
  async getDashboardData(userId: string): Promise<SeekerDashboardResponseDto> {
    const startTime = Date.now();

    try {
      // Server-side parallel data fetching - All queries run simultaneously
      const [
        references,
        bundles,
        // In real implementation, you'd also fetch notifications, etc.
      ] = await Promise.all([
        this.referenceRepo.find({
          where: { seekerId: userId },
          relations: ['referrer'],
          order: { createdAt: 'DESC' },
        }),
        this.bundleRepo.find({
          where: { userId },
          order: { createdAt: 'DESC' },
          take: 5,
        }),
      ]);

      // Server-side data transformation and computation
      const stats = this.computeStats(references);
      const recentReferences = references
        .slice(0, 5)
        .map((ref) => this.transformReferenceForDisplay(ref));
      const pendingRequests = references
        .filter((ref) => ref.status === 'pending')
        .slice(0, 10)
        .map((ref) => this.transformToPendingRequest(ref));
      const bundleSummaries = bundles.map((bundle) =>
        this.transformToBundleSummary(bundle),
      );
      const trends = await this.computeTrends(userId, references);
      const recommendations = await this.generateRecommendations(userId, references);

      // Mock notifications - in real implementation, fetch from notification service
      const notifications: NotificationDto[] = [];

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Dashboard data aggregated for user ${userId} in ${executionTime}ms`,
      );

      return {
        stats,
        recentReferences,
        pendingRequests,
        bundles: bundleSummaries,
        notifications,
        recommendations,
        trends,
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataFreshness: 0,
          quotaUsed: references.length,
          quotaLimit: 50, // Should come from user quota service
        },
      };
    } catch (error) {
      this.logger.error(
        `Error aggregating dashboard data for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Server-side statistics computation
   */
  private computeStats(references: Reference[]): DashboardStatsDto {
    const total = references.length;
    const pending = references.filter((r) => r.status === 'pending').length;
    const completed = references.filter((r) => r.status === 'completed').length;
    const declined = references.filter((r) => r.status === 'declined').length;

    // Calculate average RCS score (only for completed references)
    const completedRefs = references.filter(
      (r) => r.status === 'completed' && r.rcsScore !== null,
    );
    const averageRcs =
      completedRefs.length > 0
        ? completedRefs.reduce((sum, r) => sum + (r.rcsScore || 0), 0) /
          completedRefs.length
        : 0;

    // Calculate completion rate
    const completionRate =
      total > 0 ? (completed / (completed + declined)) * 100 : 0;

    // Calculate average response time
    const responseTimes = completedRefs
      .filter((r) => r.submittedAt)
      .map((r) => {
        const created = new Date(r.createdAt).getTime();
        const submitted = new Date(r.submittedAt!).getTime();
        return (submitted - created) / (1000 * 60 * 60 * 24); // days
      });

    const avgResponseDays =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, days) => sum + days, 0) /
          responseTimes.length
        : 0;

    // Calculate percentile (simplified - in production, compare against all users)
    const percentile = Math.min(
      100,
      Math.max(0, Math.round((averageRcs / 100) * 100)),
    );

    return {
      totalReferences: total,
      pendingRequests: pending,
      completedReferences: completed,
      declinedReferences: declined,
      averageRcsScore: Math.round(averageRcs * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      averageResponseTime:
        avgResponseDays < 1
          ? `${Math.round(avgResponseDays * 24)} hours`
          : `${Math.round(avgResponseDays)} days`,
      percentile,
    };
  }

  /**
   * Transform database model to UI-ready format
   * Server computes all display properties
   */
  private transformReferenceForDisplay(
    reference: Reference,
  ): ReferenceDisplayDto {
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
      duration: this.formatDuration(0), // Mock - calculate from actual content
      rcsScore: reference.rcsScore
        ? {
            overall: reference.rcsScore,
            breakdown: {
              authenticity: reference.aiAuthenticityScore || 0,
              relevance: 0, // Mock - calculate from actual data
              clarity: 0,
              sentiment: 0,
            },
            percentile: this.calculatePercentile(reference.rcsScore),
            badge: this.getRcsBadge(reference.rcsScore),
          }
        : undefined,
      status: {
        value: reference.status,
        label: this.getStatusLabel(reference.status),
        color: this.getStatusColor(reference.status),
        icon: this.getStatusIcon(reference.status),
      },
      actions: this.getAvailableActions(reference),
      thumbnailUrl: reference.contentUrl || undefined,
      preview:
        reference.format === 'text'
          ? this.truncateText(JSON.stringify(reference.responses), 200)
          : undefined,
    };
  }

  /**
   * Transform to pending request format
   */
  private transformToPendingRequest(reference: Reference): PendingRequestDto {
    const now = new Date();
    const created = new Date(reference.createdAt);
    const expiry = reference.expiryDate || new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    const timeRemaining = expiry.getTime() - now.getTime();
    const totalTime = expiry.getTime() - created.getTime();

    return {
      id: reference.id,
      referrerName: reference.referrerName,
      referrerEmail: reference.referrerEmail,
      company: reference.company,
      role: reference.role,
      requestedAt: reference.createdAt.toISOString(),
      relativeTime: this.getRelativeTime(reference.createdAt),
      timeRemaining: this.formatTimeRemaining(timeRemaining),
      expiryPercentage: Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100)),
      status: {
        value: reference.status,
        label: this.getStatusLabel(reference.status),
        color: this.getStatusColor(reference.status),
      },
    };
  }

  /**
   * Transform bundle to summary format
   */
  private transformToBundleSummary(bundle: Bundle): BundleSummaryDto {
    return {
      id: bundle.id,
      name: bundle.name,
      referenceCount: bundle.referenceIds?.length || 0,
      averageRcsScore: 0, // Calculate from references
      createdAt: bundle.createdAt.toISOString(),
      sharedWith: 0, // Mock - track sharing in real implementation
      views: 0, // Mock - track views in real implementation
    };
  }

  /**
   * Compute trends over time
   */
  private async computeTrends(
    userId: string,
    references: Reference[],
  ): Promise<TrendsDto> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last7Days = references.filter(
      (r) => new Date(r.createdAt) >= sevenDaysAgo,
    );
    const prev7Days = references.filter((r) => {
      const date = new Date(r.createdAt);
      return (
        date >= new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000) &&
        date < sevenDaysAgo
      );
    });

    const requestsChange =
      prev7Days.length > 0
        ? ((last7Days.length - prev7Days.length) / prev7Days.length) * 100
        : 0;

    return {
      period: '7-day',
      requestsChange: Math.round(requestsChange * 10) / 10,
      rcsScoreChange: 0, // Mock - calculate from actual data
      completionRateChange: 0,
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [0, 0, 0, 0, 0, 0, last7Days.length], // Mock data
      },
    };
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    userId: string,
    references: Reference[],
  ): Promise<RecommendationDto[]> {
    const recommendations: RecommendationDto[] = [];

    // Check if user needs more references
    if (references.length < 3) {
      recommendations.push({
        type: 'action',
        title: 'Add More References',
        description:
          'Having at least 3 references increases your credibility by 40%',
        priority: 'high',
        actionUrl: '/references/request',
        actionLabel: 'Request Reference',
      });
    }

    // Check for pending requests about to expire
    const expiringRequests = references.filter((r) => {
      if (r.status !== 'pending' || !r.expiryDate) return false;
      const daysRemaining =
        (new Date(r.expiryDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      return daysRemaining < 2 && daysRemaining > 0;
    });

    if (expiringRequests.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Follow Up Required',
        description: `${expiringRequests.length} reference request(s) expiring soon`,
        priority: 'high',
        actionUrl: '/references/pending',
        actionLabel: 'Send Reminder',
      });
    }

    return recommendations;
  }

  // Utility methods for data transformation

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private formatTimeRemaining(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  }

  private calculatePercentile(score: number): number {
    // Simplified percentile calculation
    // In production, compare against distribution of all scores
    return Math.min(100, Math.max(0, Math.round((score / 100) * 100)));
  }

  private getRcsBadge(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
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

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
