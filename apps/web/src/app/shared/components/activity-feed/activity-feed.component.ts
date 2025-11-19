/**
 * Activity Feed Component
 *
 * Displays a timeline of recent activities.
 * Used in dashboard to show recent events.
 */

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentActivity } from '../../../features/seeker/models/seeker.models';

/**
 * Activity Feed Component
 */
@Component({
  selector: 'app-activity-feed',
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      @if (activities().length > 0) {
        <div class="space-y-4">
          @for (activity of activities(); track activity.id) {
            <div class="flex items-start space-x-3">
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                [ngClass]="getActivityIconBgClass(activity.type)"
              >
                <i [class]="getActivityIcon(activity.type)" class="text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ activity.title }}</p>
                <p class="text-sm text-gray-500">{{ activity.description }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ formatTimestamp(activity.timestamp) }}
                </p>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-8">
          <i class="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
          <p class="text-sm text-gray-500">No recent activity</p>
        </div>
      }
    </div>
  `,
})
export class ActivityFeedComponent {
  activities = input.required<RecentActivity[]>();

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      request_sent: 'pi pi-send text-blue-600',
      reference_received: 'pi pi-check-circle text-green-600',
      bundle_created: 'pi pi-folder text-purple-600',
      bundle_viewed: 'pi pi-eye text-orange-600',
    };
    return icons[type] || 'pi pi-info-circle text-gray-600';
  }

  getActivityIconBgClass(type: string): string {
    const classes: Record<string, string> = {
      request_sent: 'bg-blue-100',
      reference_received: 'bg-green-100',
      bundle_created: 'bg-purple-100',
      bundle_viewed: 'bg-orange-100',
    };
    return classes[type] || 'bg-gray-100';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }
}
