/**
 * Seeker Dashboard Component
 *
 * Main dashboard for job seekers showing:
 * - Statistics (references, requests, bundles)
 * - Active reference requests
 * - Recent activity feed
 * - Quick actions
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { DashboardActions } from '../../store/seeker.actions';
import {
  selectDashboardData,
  selectIsLoading,
  selectError,
} from '../../store/seeker.selectors';
import {
  DashboardStats,
  RecentActivity,
  ReferenceRequest,
  Reference,
  Bundle,
} from '../../models/seeker.models';

import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { ActivityFeedComponent } from '../../../../shared/components/activity-feed/activity-feed.component';

/**
 * Dashboard Component
 */
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, StatCardComponent, ActivityFeedComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private store = inject(Store);

  // Observables
  dashboardData$: Observable<{
    stats: DashboardStats | null;
    activity: RecentActivity[];
    pendingRequests: ReferenceRequest[];
    references: Reference[];
    activeBundles: Bundle[];
  }> = this.store.select(selectDashboardData);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectError);

  ngOnInit(): void {
    this.store.dispatch(DashboardActions.loadDashboard());
  }

  refreshDashboard(): void {
    this.store.dispatch(DashboardActions.loadDashboard());
  }

  refreshActivity(): void {
    this.store.dispatch(DashboardActions.refreshActivity());
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
}
