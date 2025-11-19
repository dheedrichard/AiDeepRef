import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference, User } from '../../database/entities';
import {
  ReferrerDashboardResponseDto,
  PendingRequestDto,
  ReferenceDisplayDto,
  NotificationDto,
  RecommendationDto,
} from '../dto';

/**
 * Referrer Aggregation Service
 *
 * Aggregates data for referrers (people providing references)
 */
@Injectable()
export class ReferrerAggregationService {
  private readonly logger = new Logger(ReferrerAggregationService.name);

  constructor(
    @InjectRepository(Reference)
    private readonly referenceRepo: Repository<Reference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Aggregate complete referrer dashboard data
   */
  async getDashboardData(
    userId: string,
  ): Promise<ReferrerDashboardResponseDto> {
    const startTime = Date.now();

    try {
      // Fetch all references where user is the referrer
      const references = await this.referenceRepo.find({
        where: { referrerId: userId },
        relations: ['seeker'],
        order: { createdAt: 'DESC' },
      });

      const pendingReferences = references.filter(
        (r) => r.status === 'pending',
      );
      const completedReferences = references.filter(
        (r) => r.status === 'completed',
      );

      // Calculate average completion time
      const completionTimes = completedReferences
        .filter((r) => r.submittedAt)
        .map((r) => {
          const created = new Date(r.createdAt).getTime();
          const submitted = new Date(r.submittedAt!).getTime();
          return (submitted - created) / (1000 * 60 * 60 * 24); // days
        });

      const avgCompletionDays =
        completionTimes.length > 0
          ? completionTimes.reduce((sum, days) => sum + days, 0) /
            completionTimes.length
          : 0;

      const stats = {
        totalRequests: references.length,
        pendingRequests: pendingReferences.length,
        completedReferences: completedReferences.length,
        averageCompletionTime:
          avgCompletionDays < 1
            ? `${Math.round(avgCompletionDays * 24)} hours`
            : `${Math.round(avgCompletionDays)} days`,
      };

      const pendingRequests = pendingReferences
        .slice(0, 10)
        .map((ref) => this.transformToPendingRequest(ref));
      const completedRefs = completedReferences
        .slice(0, 10)
        .map((ref) => this.transformReferenceForDisplay(ref));
      const notifications: NotificationDto[] = []; // Mock
      const insights = this.generateInsights(references);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Referrer dashboard data aggregated for user ${userId} in ${executionTime}ms`,
      );

      return {
        stats,
        pendingRequests,
        completedReferences: completedRefs,
        notifications,
        insights,
      };
    } catch (error) {
      this.logger.error(
        `Error aggregating referrer dashboard data for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  private transformToPendingRequest(reference: Reference): PendingRequestDto {
    const now = new Date();
    const created = new Date(reference.createdAt);
    const expiry =
      reference.expiryDate ||
      new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
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
      expiryPercentage: Math.max(
        0,
        Math.min(100, (timeRemaining / totalTime) * 100),
      ),
      status: {
        value: reference.status,
        label: this.getStatusLabel(reference.status),
        color: this.getStatusColor(reference.status),
      },
    };
  }

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
      status: {
        value: reference.status,
        label: this.getStatusLabel(reference.status),
        color: this.getStatusColor(reference.status),
        icon: this.getStatusIcon(reference.status),
      },
      actions: ['view'],
    };
  }

  private generateInsights(references: Reference[]): RecommendationDto[] {
    const insights: RecommendationDto[] = [];

    const pending = references.filter((r) => r.status === 'pending');
    if (pending.length > 0) {
      insights.push({
        type: 'info',
        title: 'Pending Requests',
        description: `You have ${pending.length} pending reference request(s)`,
        priority: 'medium',
        actionUrl: '/referrer/pending',
        actionLabel: 'View Requests',
      });
    }

    const completed = references.filter((r) => r.status === 'completed');
    if (completed.length > 5) {
      insights.push({
        type: 'success',
        title: 'Great Job!',
        description: `You've provided ${completed.length} references and helped others succeed`,
        priority: 'low',
      });
    }

    return insights;
  }

  // Utility methods
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

  private formatTimeRemaining(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
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
}
