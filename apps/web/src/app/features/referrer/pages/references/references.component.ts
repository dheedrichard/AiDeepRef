/**
 * References Management Component
 *
 * List and filter all reference requests and completed references.
 * Provides search, filtering, and sorting capabilities.
 */

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ReferrerActions } from '../../store/referrer.actions';
import {
  selectAllRequests,
  selectCompletedReferences,
  selectIsLoading,
} from '../../store/referrer.selectors';
import { ReferenceRequest, CompletedReference, ReferenceRequestStatus } from '../../models/referrer.models';

type FilterType = 'all' | 'pending' | 'accepted' | 'completed' | 'declined';

@Component({
  selector: 'app-references',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">My References</h1>
          <p class="mt-2 text-gray-600">View and manage all your reference requests</p>
        </div>

        <!-- Filters & Search -->
        <div class="bg-white rounded-lg shadow mb-6 p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Search -->
            <div class="md:col-span-2">
              <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchChange()"
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent"
                  placeholder="Search by seeker name, company..."
                />
              </div>
            </div>

            <!-- Status Filter -->
            <div>
              <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                [(ngModel)]="statusFilter"
                (ngModelChange)="onFilterChange()"
                class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          <!-- Filter Chips -->
          <div class="mt-4 flex items-center space-x-2">
            @if (searchQuery() || statusFilter() !== 'all') {
              <span class="text-sm text-gray-600">Active filters:</span>
              @if (searchQuery()) {
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-purple text-white">
                  Search: "{{ searchQuery() }}"
                  <button (click)="clearSearch()" class="ml-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              }
              @if (statusFilter() !== 'all') {
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-purple text-white">
                  Status: {{ statusFilter() }}
                  <button (click)="clearStatusFilter()" class="ml-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              }
              <button
                (click)="clearAllFilters()"
                class="text-sm text-primary-purple hover:underline"
              >
                Clear all
              </button>
            }
          </div>
        </div>

        <!-- Results Count -->
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Showing {{ filteredItems().length }} result{{ filteredItems().length !== 1 ? 's' : '' }}
          </p>
          <button
            (click)="toggleSortOrder()"
            class="text-sm text-primary-purple hover:underline flex items-center space-x-1"
          >
            <span>{{ sortOrder() === 'desc' ? 'Newest first' : 'Oldest first' }}</span>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
          </div>
        } @else {
          <!-- References List -->
          @if (filteredItems().length > 0) {
            <div class="space-y-4">
              @for (item of filteredItems(); track item.id) {
                <div class="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  @if (isRequest(item)) {
                    <!-- Reference Request -->
                    <div class="flex items-start justify-between">
                      <div class="flex items-start space-x-4 flex-1">
                        <!-- Avatar -->
                        <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          @if (item.seeker.profileImageUrl) {
                            <img
                              [src]="item.seeker.profileImageUrl"
                              [alt]="item.seeker.firstName"
                              class="w-12 h-12 rounded-full object-cover"
                            />
                          } @else {
                            <span class="text-lg font-semibold text-gray-600">
                              {{ item.seeker.firstName.charAt(0) }}{{ item.seeker.lastName.charAt(0) }}
                            </span>
                          }
                        </div>

                        <!-- Info -->
                        <div class="flex-1">
                          <div class="flex items-center space-x-3 mb-2">
                            <h3 class="text-lg font-semibold text-gray-900">
                              {{ item.seeker.firstName }} {{ item.seeker.lastName }}
                            </h3>
                            <span
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [class.bg-yellow-100]="item.status === 'pending'"
                              [class.text-yellow-800]="item.status === 'pending'"
                              [class.bg-blue-100]="item.status === 'accepted'"
                              [class.text-blue-800]="item.status === 'accepted'"
                              [class.bg-green-100]="item.status === 'completed'"
                              [class.text-green-800]="item.status === 'completed'"
                              [class.bg-red-100]="item.status === 'declined'"
                              [class.text-red-800]="item.status === 'declined'"
                            >
                              {{ item.status }}
                            </span>
                          </div>
                          @if (item.seeker.company && item.seeker.role) {
                            <p class="text-sm text-gray-600 mb-2">
                              {{ item.seeker.role }} at {{ item.seeker.company }}
                            </p>
                          }
                          <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{{ item.questions.length }} question{{ item.questions.length !== 1 ? 's' : '' }}</span>
                            <span>•</span>
                            <span>Requested {{ formatDate(item.requestedAt) }}</span>
                            @if (item.status === 'pending') {
                              <span>•</span>
                              <span>Expires {{ formatDate(item.expiresAt) }}</span>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Actions -->
                      <div class="ml-4">
                        @if (item.status === 'pending') {
                          <a
                            [routerLink]="['/referrer/invite', item.id]"
                            class="inline-flex items-center px-4 py-2 bg-primary-purple hover:bg-primary-purple-hover text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Respond
                          </a>
                        } @else if (item.status === 'accepted') {
                          <a
                            [routerLink]="['/referrer/respond', item.id]"
                            class="inline-flex items-center px-4 py-2 bg-primary-purple hover:bg-primary-purple-hover text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Continue
                          </a>
                        } @else {
                          <button
                            class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg cursor-default"
                          >
                            {{ item.status }}
                          </button>
                        }
                      </div>
                    </div>
                  } @else {
                    <!-- Completed Reference -->
                    <div class="flex items-start justify-between">
                      <div class="flex items-start space-x-4 flex-1">
                        <!-- Check Icon -->
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fill-rule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </div>

                        <!-- Info -->
                        <div class="flex-1">
                          <h3 class="text-lg font-semibold text-gray-900 mb-2">
                            {{ item.seeker.firstName }} {{ item.seeker.lastName }}
                          </h3>
                          <div class="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <span class="inline-flex items-center">
                              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              RCS Score: {{ item.rcsScore }}
                            </span>
                            <span>•</span>
                            <span class="uppercase">{{ item.format }}</span>
                            <span>•</span>
                            <span>{{ formatDate(item.submittedAt) }}</span>
                          </div>
                          <div class="inline-flex items-center text-xs text-gray-500">
                            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fill-rule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clip-rule="evenodd"
                              />
                            </svg>
                            Viewed {{ item.viewCount }} time{{ item.viewCount !== 1 ? 's' : '' }}
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Empty State -->
            <div class="bg-white rounded-lg shadow p-12 text-center">
              <svg
                class="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No references found</h3>
              <p class="text-gray-600 mb-6">
                @if (searchQuery() || statusFilter() !== 'all') {
                  Try adjusting your filters to find what you're looking for.
                } @else {
                  When someone requests a reference from you, it will appear here.
                }
              </p>
              @if (searchQuery() || statusFilter() !== 'all') {
                <button
                  (click)="clearAllFilters()"
                  class="inline-flex items-center px-4 py-2 bg-primary-purple hover:bg-primary-purple-hover text-white font-medium rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              }
            </div>
          }
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
export class ReferencesComponent implements OnInit {
  private readonly store = inject(Store);

  // Selectors
  requests = this.store.selectSignal(selectAllRequests);
  completedReferences = this.store.selectSignal(selectCompletedReferences);
  isLoading = this.store.selectSignal(selectIsLoading);

  // Filters
  searchQuery = signal('');
  statusFilter = signal<FilterType>('all');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Combined and filtered items
  filteredItems = computed(() => {
    const reqs = this.requests() || [];
    const completed = this.completedReferences() || [];
    const combined: (ReferenceRequest | CompletedReference)[] = [...reqs, ...completed];

    let filtered = combined;

    // Apply status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter((item) => {
        if ('status' in item) {
          return item.status === this.statusFilter();
        } else if (this.statusFilter() === 'completed') {
          return true;
        }
        return false;
      });
    }

    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter((item) => {
        const seeker = item.seeker;
        const name = `${seeker.firstName} ${seeker.lastName}`.toLowerCase();
        const company = seeker.company?.toLowerCase() || '';
        const role = seeker.role?.toLowerCase() || '';
        return name.includes(query) || company.includes(query) || role.includes(query);
      });
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = 'requestedAt' in a ? a.requestedAt : a.submittedAt;
      const dateB = 'requestedAt' in b ? b.requestedAt : b.submittedAt;
      const comparison = new Date(dateB).getTime() - new Date(dateA).getTime();
      return this.sortOrder() === 'desc' ? comparison : -comparison;
    });

    return filtered;
  });

  ngOnInit(): void {
    this.store.dispatch(ReferrerActions.loadRequests());
    this.store.dispatch(ReferrerActions.loadCompletedReferences());
  }

  /**
   * Check if item is a request (vs completed reference)
   */
  isRequest(item: ReferenceRequest | CompletedReference): item is ReferenceRequest {
    return 'status' in item && 'questions' in item;
  }

  /**
   * Handle search change
   */
  onSearchChange(): void {
    // Filters are reactive via signals
  }

  /**
   * Handle filter change
   */
  onFilterChange(): void {
    // Filters are reactive via signals
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery.set('');
  }

  /**
   * Clear status filter
   */
  clearStatusFilter(): void {
    this.statusFilter.set('all');
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
  }

  /**
   * Toggle sort order
   */
  toggleSortOrder(): void {
    this.sortOrder.update((order) => (order === 'desc' ? 'asc' : 'desc'));
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }
}
