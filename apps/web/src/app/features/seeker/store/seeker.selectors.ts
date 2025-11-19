/**
 * Seeker Selectors
 *
 * Defines all selectors for the seeker feature state.
 * Uses memoization for optimal performance.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SeekerState, ReferenceRequestStatus, BundleStatus } from '../models/seeker.models';
import { seekerFeatureKey } from './seeker.reducer';

/**
 * Feature Selector
 */
export const selectSeekerState = createFeatureSelector<SeekerState>(seekerFeatureKey);

/**
 * Dashboard Selectors
 */
export const selectDashboardStats = createSelector(
  selectSeekerState,
  (state) => state.dashboardStats
);

export const selectRecentActivity = createSelector(
  selectSeekerState,
  (state) => state.recentActivity
);

/**
 * Reference Request Selectors
 */
export const selectAllRequests = createSelector(
  selectSeekerState,
  (state) => state.requests
);

export const selectSelectedRequest = createSelector(
  selectSeekerState,
  (state) => state.selectedRequest
);

export const selectPendingRequests = createSelector(selectAllRequests, (requests) =>
  requests.filter(
    (r) => r.status === ReferenceRequestStatus.PENDING || r.status === ReferenceRequestStatus.SENT
  )
);

export const selectCompletedRequests = createSelector(selectAllRequests, (requests) =>
  requests.filter((r) => r.status === ReferenceRequestStatus.COMPLETED)
);

export const selectRequestsCount = createSelector(
  selectAllRequests,
  (requests) => requests.length
);

/**
 * Reference Selectors
 */
export const selectAllReferences = createSelector(
  selectSeekerState,
  (state) => state.references
);

export const selectSelectedReference = createSelector(
  selectSeekerState,
  (state) => state.selectedReference
);

export const selectReferenceFilters = createSelector(
  selectSeekerState,
  (state) => state.referenceFilters
);

export const selectFilteredReferences = createSelector(
  selectAllReferences,
  selectReferenceFilters,
  (references, filters) => {
    let filtered = references;

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((r) => filters.status?.includes(r.status));
    }

    if (filters.format && filters.format.length > 0) {
      filtered = filtered.filter((r) => filters.format?.includes(r.format));
    }

    if (filters.minRCS !== undefined) {
      filtered = filtered.filter((r) => r.rcsScore >= filters.minRCS!);
    }

    if (filters.maxRCS !== undefined) {
      filtered = filtered.filter((r) => r.rcsScore <= filters.maxRCS!);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((r) => r.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((r) => r.createdAt <= filters.dateTo!);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.referrerName.toLowerCase().includes(query) ||
          r.company.toLowerCase().includes(query) ||
          r.role.toLowerCase().includes(query)
      );
    }

    return filtered;
  }
);

export const selectVerifiedReferences = createSelector(selectAllReferences, (references) =>
  references.filter((r) => r.isVerified)
);

export const selectAverageRCS = createSelector(selectAllReferences, (references) => {
  if (references.length === 0) return 0;
  const total = references.reduce((sum, r) => sum + r.rcsScore, 0);
  return Math.round((total / references.length) * 10) / 10;
});

export const selectReferencesCount = createSelector(
  selectAllReferences,
  (references) => references.length
);

/**
 * Bundle Selectors
 */
export const selectAllBundles = createSelector(selectSeekerState, (state) => state.bundles);

export const selectSelectedBundle = createSelector(
  selectSeekerState,
  (state) => state.selectedBundle
);

export const selectActiveBundles = createSelector(selectAllBundles, (bundles) =>
  bundles.filter((b) => b.status === BundleStatus.ACTIVE)
);

export const selectExpiredBundles = createSelector(selectAllBundles, (bundles) =>
  bundles.filter((b) => b.status === BundleStatus.EXPIRED)
);

export const selectArchivedBundles = createSelector(selectAllBundles, (bundles) =>
  bundles.filter((b) => b.status === BundleStatus.ARCHIVED)
);

export const selectBundlesCount = createSelector(selectAllBundles, (bundles) => bundles.length);

export const selectActiveBundlesCount = createSelector(
  selectActiveBundles,
  (bundles) => bundles.length
);

/**
 * Loading Selectors
 */
export const selectIsLoading = createSelector(selectSeekerState, (state) => state.isLoading);

export const selectIsLoadingRequests = createSelector(
  selectSeekerState,
  (state) => state.isLoadingRequests
);

export const selectIsLoadingReferences = createSelector(
  selectSeekerState,
  (state) => state.isLoadingReferences
);

export const selectIsLoadingBundles = createSelector(
  selectSeekerState,
  (state) => state.isLoadingBundles
);

export const selectIsLoadingAny = createSelector(
  selectIsLoading,
  selectIsLoadingRequests,
  selectIsLoadingReferences,
  selectIsLoadingBundles,
  (loading, loadingRequests, loadingReferences, loadingBundles) =>
    loading || loadingRequests || loadingReferences || loadingBundles
);

/**
 * Error Selector
 */
export const selectError = createSelector(selectSeekerState, (state) => state.error);

/**
 * Combined Dashboard Data Selector
 */
export const selectDashboardData = createSelector(
  selectDashboardStats,
  selectRecentActivity,
  selectPendingRequests,
  selectAllReferences,
  selectActiveBundles,
  (stats, activity, pendingRequests, references, activeBundles) => ({
    stats,
    activity,
    pendingRequests,
    references,
    activeBundles,
  })
);
