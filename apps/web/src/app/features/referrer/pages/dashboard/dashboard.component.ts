/**
 * Referrer Dashboard Component
 *
 * Main dashboard for referrers showing:
 * - Statistics (pending requests, completed references, response rate)
 * - Pending reference requests
 * - Recent notifications
 * - Quick action buttons
 */

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ReferrerActions } from '../../store/referrer.actions';
import {
  selectStatistics,
  selectPendingRequests,
  selectUnreadNotifications,
  selectIsLoading,
  selectCompletedReferences,
} from '../../store/referrer.selectors';

@Component({
  selector: 'app-referrer-dashboard',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Referrer Dashboard</h1>
          <p class="mt-2 text-gray-600">Manage your reference requests and track your impact</p>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
          </div>
        } @else {
          <!-- Statistics Cards -->
          @if (stats()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <!-- Total Requests -->
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">Total Requests</p>
                    <p class="text-2xl font-bold text-gray-900">{{ stats()!.totalRequests }}</p>
                  </div>
                </div>
              </div>

              <!-- Pending Requests -->
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">Pending</p>
                    <p class="text-2xl font-bold text-gray-900">{{ stats()!.pendingRequests }}</p>
                  </div>
                </div>
              </div>

              <!-- Completed References -->
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">Completed</p>
                    <p class="text-2xl font-bold text-gray-900">{{ stats()!.completedReferences }}</p>
                  </div>
                </div>
              </div>

              <!-- Average RCS Score -->
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">Avg RCS Score</p>
                    <p class="text-2xl font-bold text-gray-900">{{ stats()!.averageRcsScore }}</p>
                  </div>
                </div>
              </div>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Pending Requests -->
              <div class="bg-white rounded-lg shadow">
                <div class="px-6 py-4 border-b border-gray-200">
                  <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-gray-900">Pending Requests</h2>
                    <a routerLink="/referrer/references" class="text-sm text-primary-purple hover:underline">
                      View All
                    </a>
                  </div>
                </div>
                <div class="divide-y divide-gray-200">
                  @if (pendingRequests() && pendingRequests()!.length > 0) {
                    @for (request of pendingRequests(); track request.id) {
                      <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div class="flex items-start justify-between">
                          <div class="flex items-start space-x-4">
                            <!-- Seeker Avatar -->
                            <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              @if (request.seeker.profileImageUrl) {
                                <img [src]="request.seeker.profileImageUrl" [alt]="request.seeker.firstName" class="w-12 h-12 rounded-full object-cover" />
                              } @else {
                                <span class="text-lg font-semibold text-gray-600">
                                  {{ request.seeker.firstName.charAt(0) }}{{ request.seeker.lastName.charAt(0) }}
                                </span>
                              }
                            </div>
                            <div class="flex-1">
                              <h3 class="text-sm font-medium text-gray-900">
                                {{ request.seeker.firstName }} {{ request.seeker.lastName }}
                              </h3>
                              @if (request.seeker.company && request.seeker.role) {
                                <p class="text-sm text-gray-600">
                                  {{ request.seeker.role }} at {{ request.seeker.company }}
                                </p>
                              }
                              <p class="text-xs text-gray-500 mt-1">
                                {{ request.questions.length }} question{{ request.questions.length !== 1 ? 's' : '' }} •
                                Expires {{ formatDate(request.expiresAt) }}
                              </p>
                            </div>
                          </div>
                          <div class="flex space-x-2">
                            <a
                              [routerLink]="['/referrer/invite', request.id]"
                              class="px-4 py-2 bg-primary-purple hover:bg-primary-purple-hover text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Respond
                            </a>
                          </div>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="px-6 py-12 text-center">
                      <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p class="text-gray-600">No pending requests</p>
                      <p class="text-sm text-gray-500 mt-1">When someone requests a reference, it will appear here</p>
                    </div>
                  }
                </div>
              </div>

              <!-- Recent Completed -->
              <div class="bg-white rounded-lg shadow">
                <div class="px-6 py-4 border-b border-gray-200">
                  <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-gray-900">Recent Completed</h2>
                    <a routerLink="/referrer/references" class="text-sm text-primary-purple hover:underline">
                      View All
                    </a>
                  </div>
                </div>
                <div class="divide-y divide-gray-200">
                  @if (recentCompleted() && recentCompleted()!.length > 0) {
                    @for (reference of recentCompleted(); track reference.id) {
                      <div class="px-6 py-4">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-4">
                            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h3 class="text-sm font-medium text-gray-900">
                                {{ reference.seeker.firstName }} {{ reference.seeker.lastName }}
                              </h3>
                              <p class="text-xs text-gray-500">
                                {{ formatDate(reference.submittedAt) }} • RCS Score: {{ reference.rcsScore }}
                              </p>
                            </div>
                          </div>
                          <span class="text-xs font-medium text-gray-600 uppercase">
                            {{ reference.format }}
                          </span>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="px-6 py-8 text-center text-gray-600">
                      No completed references yet
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
              <!-- Notifications -->
              <div class="bg-white rounded-lg shadow">
                <div class="px-6 py-4 border-b border-gray-200">
                  <h2 class="text-lg font-semibold text-gray-900">Notifications</h2>
                </div>
                <div class="divide-y divide-gray-200">
                  @if (notifications() && notifications()!.length > 0) {
                    @for (notification of notifications(); track notification.id) {
                      <div
                        class="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        [class.bg-blue-50]="!notification.read"
                        (click)="markAsRead(notification.id)"
                      >
                        <div class="flex items-start space-x-3">
                          <div class="flex-shrink-0">
                            @switch (notification.type) {
                              @case ('new_request') {
                                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                  </svg>
                                </div>
                              }
                              @case ('reminder') {
                                <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                  <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                  </svg>
                                </div>
                              }
                              @default {
                                <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                  </svg>
                                </div>
                              }
                            }
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">
                              {{ notification.title }}
                            </p>
                            <p class="text-xs text-gray-600 mt-1">
                              {{ notification.message }}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                              {{ formatDate(notification.createdAt) }}
                            </p>
                          </div>
                          @if (!notification.read) {
                            <div class="flex-shrink-0">
                              <div class="w-2 h-2 bg-blue-600 rounded-full"></div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="px-6 py-8 text-center text-gray-600">
                      No new notifications
                    </div>
                  }
                </div>
              </div>

              <!-- Quick Actions -->
              <div class="bg-primary-purple rounded-lg shadow p-6 text-white">
                <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
                <div class="space-y-3">
                  <a
                    routerLink="/referrer/references"
                    class="block w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-center py-2 px-4 rounded-lg transition-colors"
                  >
                    View All Requests
                  </a>
                  <a
                    routerLink="/referrer/references"
                    [queryParams]="{ filter: 'completed' }"
                    class="block w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-center py-2 px-4 rounded-lg transition-colors"
                  >
                    View History
                  </a>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);

  // Selectors
  stats = this.store.selectSignal(selectStatistics);
  pendingRequests = this.store.selectSignal(selectPendingRequests);
  notifications = this.store.selectSignal(selectUnreadNotifications);
  isLoading = this.store.selectSignal(selectIsLoading);
  completedReferences = this.store.selectSignal(selectCompletedReferences);

  // Recent completed (top 3)
  recentCompleted = this.store.selectSignal(selectCompletedReferences, {
    transform: (refs) => refs.slice(0, 3),
  });

  ngOnInit(): void {
    // Load dashboard data
    this.store.dispatch(ReferrerActions.loadStatistics());
    this.store.dispatch(ReferrerActions.loadRequests());
    this.store.dispatch(ReferrerActions.loadNotifications());
    this.store.dispatch(ReferrerActions.loadCompletedReferences());
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    this.store.dispatch(ReferrerActions.markNotificationRead({ notificationId }));
  }
}
