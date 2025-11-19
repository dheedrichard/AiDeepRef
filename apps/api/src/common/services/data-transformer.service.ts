import { Injectable, Logger } from '@nestjs/common';
import { Reference, ReferenceStatus, ReferenceFormat } from '../../database/entities';

/**
 * Data Transformer Service
 *
 * Purpose: Transform database models to UI-ready format on server
 * Benefits:
 * - Client receives ready-to-display data
 * - Consistent data format across all endpoints
 * - No client-side computation required
 * - Server handles all formatting, calculations, and enrichment
 */
@Injectable()
export class DataTransformerService {
  private readonly logger = new Logger(DataTransformerService.name);

  /**
   * Transform reference entity to UI-ready display format
   * Server computes ALL display properties
   */
  transformReferenceForDisplay(reference: Reference): any {
    return {
      id: reference.id,
      referrerName: this.formatName(reference),
      company: reference.company,
      role: reference.role,
      submittedAt: reference.submittedAt
        ? reference.submittedAt.toISOString()
        : reference.createdAt.toISOString(),
      relativeTime: this.getRelativeTime(
        reference.submittedAt || reference.createdAt,
      ), // Server calculates
      format: reference.format,
      duration: this.formatDuration(0), // Would extract from content
      rcsScore: reference.rcsScore
        ? {
            overall: reference.rcsScore,
            breakdown: this.calculateRcsBreakdown(reference), // Server computes
            percentile: this.calculatePercentile(reference.rcsScore), // Server computes
            badge: this.getRcsBadge(reference.rcsScore), // "Excellent", "Good", etc.
          }
        : null,
      status: {
        value: reference.status,
        label: this.getStatusLabel(reference.status),
        color: this.getStatusColor(reference.status),
        icon: this.getStatusIcon(reference.status),
      },
      actions: this.getAvailableActions(reference), // Server determines available actions
      thumbnailUrl: this.generateThumbnailUrl(reference), // Server generates
      preview:
        reference.format === ReferenceFormat.TEXT
          ? this.truncateText(JSON.stringify(reference.responses), 200)
          : null,
    };
  }

  /**
   * Transform user entity to profile format
   */
  transformUserToProfile(user: any): any {
    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profilePictureUrl: user.profilePictureUrl,
      phoneNumber: user.phoneNumber,
      kycStatus: {
        value: user.kycStatus,
        label: this.getKycStatusLabel(user.kycStatus),
        color: this.getKycStatusColor(user.kycStatus),
      },
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      memberSince: this.formatMemberSince(user.createdAt),
      lastLogin: user.lastLoginAt
        ? this.getRelativeTime(user.lastLoginAt)
        : 'Never',
    };
  }

  /**
   * Transform bundle entity to summary format
   */
  transformBundleToSummary(bundle: any, references: Reference[]): any {
    const bundleRefs = references.filter((ref) =>
      bundle.referenceIds?.includes(ref.id),
    );

    const avgRcs =
      bundleRefs.length > 0
        ? bundleRefs
            .filter((r) => r.rcsScore)
            .reduce((sum, r) => sum + (r.rcsScore || 0), 0) / bundleRefs.length
        : 0;

    return {
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      referenceCount: bundleRefs.length,
      averageRcsScore: Math.round(avgRcs * 10) / 10,
      createdAt: bundle.createdAt.toISOString(),
      relativeTime: this.getRelativeTime(bundle.createdAt),
      isPublic: bundle.isPublic || false,
      sharedWith: 0, // Would come from sharing tracking
      views: 0, // Would come from analytics
      formatBreakdown: this.getFormatBreakdown(bundleRefs),
    };
  }

  /**
   * Server-side dashboard stats computation
   */
  computeDashboardStats(references: Reference[]): any {
    const total = references.length;
    const pending = references.filter(
      (r) => r.status === ReferenceStatus.PENDING,
    ).length;
    const completed = references.filter(
      (r) => r.status === ReferenceStatus.COMPLETED,
    ).length;
    const declined = references.filter(
      (r) => r.status === ReferenceStatus.DECLINED,
    ).length;

    const completedRefs = references.filter(
      (r) => r.status === ReferenceStatus.COMPLETED && r.rcsScore !== null,
    );
    const averageRcs =
      completedRefs.length > 0
        ? completedRefs.reduce((sum, r) => sum + (r.rcsScore || 0), 0) /
          completedRefs.length
        : 0;

    const completionRate =
      completed + declined > 0 ? (completed / (completed + declined)) * 100 : 0;

    const avgResponseTime = this.calculateAverageResponseTime(completedRefs);
    const topPerformingReferrers = this.getTopReferrers(references, 5);
    const recentTrends = this.calculateTrends(references);

    return {
      totalReferences: total,
      pendingRequests: pending,
      completedReferences: completed,
      declinedReferences: declined,
      averageRcsScore: Math.round(averageRcs * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      averageResponseTime: avgResponseTime,
      percentile: this.calculateGlobalPercentile(averageRcs),
      topPerformingReferrers,
      recentTrends,
    };
  }

  // Private helper methods for data transformation

  private formatName(reference: Reference): string {
    // In production, might parse and format name properly
    return reference.referrerName;
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffMonths < 12)
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private calculateRcsBreakdown(reference: Reference): any {
    // In production, these would be stored in database
    return {
      authenticity: reference.aiAuthenticityScore || 0,
      relevance: 85, // Mock
      clarity: 90, // Mock
      sentiment: 88, // Mock
    };
  }

  private calculatePercentile(score: number): number {
    // Simplified - in production, compare against all users' scores
    return Math.min(100, Math.max(0, Math.round((score / 100) * 100)));
  }

  private getRcsBadge(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
  }

  private getStatusLabel(status: ReferenceStatus): string {
    const labels: Record<string, string> = {
      [ReferenceStatus.PENDING]: 'Pending',
      [ReferenceStatus.COMPLETED]: 'Completed',
      [ReferenceStatus.DECLINED]: 'Declined',
      [ReferenceStatus.EXPIRED]: 'Expired',
    };
    return labels[status] || status;
  }

  private getStatusColor(status: ReferenceStatus): string {
    const colors: Record<string, string> = {
      [ReferenceStatus.PENDING]: '#FFA500',
      [ReferenceStatus.COMPLETED]: '#28A745',
      [ReferenceStatus.DECLINED]: '#DC3545',
      [ReferenceStatus.EXPIRED]: '#6C757D',
    };
    return colors[status] || '#6C757D';
  }

  private getStatusIcon(status: ReferenceStatus): string {
    const icons: Record<string, string> = {
      [ReferenceStatus.PENDING]: 'clock',
      [ReferenceStatus.COMPLETED]: 'check-circle',
      [ReferenceStatus.DECLINED]: 'x-circle',
      [ReferenceStatus.EXPIRED]: 'alert-circle',
    };
    return icons[status] || 'circle';
  }

  private getAvailableActions(reference: Reference): string[] {
    const actions: string[] = ['view', 'download'];

    if (reference.status === ReferenceStatus.COMPLETED) {
      actions.push('share', 'add-to-bundle', 'export-pdf');
    }

    if (reference.status === ReferenceStatus.PENDING) {
      actions.push('remind', 'cancel', 'extend');
    }

    return actions;
  }

  private generateThumbnailUrl(reference: Reference): string | null {
    if (!reference.contentUrl) return null;

    // In production, generate actual thumbnail
    if (reference.format === ReferenceFormat.VIDEO) {
      return `${reference.contentUrl}/thumbnail.jpg`;
    }

    return null;
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private getKycStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending Verification',
      verified: 'Verified',
      failed: 'Verification Failed',
    };
    return labels[status] || status;
  }

  private getKycStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#FFA500',
      verified: '#28A745',
      failed: '#DC3545',
    };
    return colors[status] || '#6C757D';
  }

  private formatMemberSince(date: Date): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const d = new Date(date);
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  private calculateAverageResponseTime(references: Reference[]): string {
    const responseTimes = references
      .filter((r) => r.submittedAt)
      .map((r) => {
        const created = new Date(r.createdAt).getTime();
        const submitted = new Date(r.submittedAt!).getTime();
        return (submitted - created) / (1000 * 60 * 60 * 24); // days
      });

    if (responseTimes.length === 0) return 'N/A';

    const avgDays =
      responseTimes.reduce((sum, days) => sum + days, 0) / responseTimes.length;

    if (avgDays < 1) {
      return `${Math.round(avgDays * 24)} hours`;
    }
    return `${Math.round(avgDays)} days`;
  }

  private getTopReferrers(references: Reference[], limit: number): any[] {
    // Group by referrer and calculate average RCS
    const referrerMap = new Map<string, { name: string; scores: number[] }>();

    references.forEach((ref) => {
      if (ref.rcsScore && ref.status === ReferenceStatus.COMPLETED) {
        const existing = referrerMap.get(ref.referrerEmail);
        if (existing) {
          existing.scores.push(ref.rcsScore);
        } else {
          referrerMap.set(ref.referrerEmail, {
            name: ref.referrerName,
            scores: [ref.rcsScore],
          });
        }
      }
    });

    const topReferrers = Array.from(referrerMap.entries())
      .map(([email, data]) => ({
        name: data.name,
        email,
        count: data.scores.length,
        averageScore:
          data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit);

    return topReferrers;
  }

  private calculateTrends(references: Reference[]): any {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const last7Days = references.filter(
      (r) => new Date(r.createdAt) >= sevenDaysAgo,
    ).length;
    const prev7Days = references.filter((r) => {
      const date = new Date(r.createdAt);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    }).length;

    const change = prev7Days > 0 ? ((last7Days - prev7Days) / prev7Days) * 100 : 0;

    return {
      period: '7-day',
      requestCount: last7Days,
      change: Math.round(change * 10) / 10,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  private calculateGlobalPercentile(score: number): number {
    // Simplified - in production, query database for actual distribution
    return Math.min(100, Math.max(0, Math.round((score / 100) * 100)));
  }

  private getFormatBreakdown(references: Reference[]): any {
    return {
      video: references.filter((r) => r.format === ReferenceFormat.VIDEO).length,
      audio: references.filter((r) => r.format === ReferenceFormat.AUDIO).length,
      text: references.filter((r) => r.format === ReferenceFormat.TEXT).length,
    };
  }
}
