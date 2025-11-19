/**
 * Employer Selectors
 *
 * Provides memoized selectors for accessing employer state.
 * Includes computed selectors for filtered references and statistics.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  EmployerState,
  Reference,
  ReferenceFormat,
  ReferenceStatus,
} from '../models/employer.models';

/**
 * Feature Selector
 */
export const selectEmployerState = createFeatureSelector<EmployerState>('employer');

/**
 * Basic Selectors
 */
export const selectCurrentBundle = createSelector(
  selectEmployerState,
  (state) => state.currentBundle
);

export const selectCurrentReference = createSelector(
  selectEmployerState,
  (state) => state.currentReference
);

export const selectSession = createSelector(
  selectEmployerState,
  (state) => state.session
);

export const selectIsLoading = createSelector(
  selectEmployerState,
  (state) => state.isLoading
);

export const selectError = createSelector(
  selectEmployerState,
  (state) => state.error
);

export const selectFilterOptions = createSelector(
  selectEmployerState,
  (state) => state.filterOptions
);

export const selectReachBackRequests = createSelector(
  selectEmployerState,
  (state) => state.reachBackRequests
);

export const selectAnalytics = createSelector(
  selectEmployerState,
  (state) => state.analytics
);

/**
 * Bundle Selectors
 */
export const selectBundleId = createSelector(
  selectCurrentBundle,
  (bundle) => bundle?.id
);

export const selectSeekerInfo = createSelector(
  selectCurrentBundle,
  (bundle) => bundle?.seeker
);

export const selectAggregatedRcs = createSelector(
  selectCurrentBundle,
  (bundle) => bundle?.aggregatedRcs
);

export const selectBundleStatistics = createSelector(
  selectCurrentBundle,
  (bundle) => bundle?.statistics
);

export const selectBundleReferences = createSelector(
  selectCurrentBundle,
  (bundle) => bundle?.references || []
);

export const selectBundleSettings = createSelector(
  selectCurrentBundle,
  (bundle) => ({
    allowPrint: bundle?.allowPrint ?? false,
    allowDownload: bundle?.allowDownload ?? false,
    watermarkEnabled: bundle?.watermarkEnabled ?? false,
    isPasswordProtected: bundle?.isPasswordProtected ?? false,
  })
);

export const selectIsExpired = createSelector(
  selectCurrentBundle,
  (bundle) => {
    if (!bundle?.expiresAt) return false;
    return new Date(bundle.expiresAt) < new Date();
  }
);

/**
 * Filtered References Selector
 */
export const selectFilteredReferences = createSelector(
  selectBundleReferences,
  selectFilterOptions,
  (references, filterOptions) => {
    let filtered = [...references];

    // Filter by format
    if (filterOptions.format) {
      filtered = filtered.filter((ref) => ref.format === filterOptions.format);
    }

    // Filter by minimum RCS score
    if (filterOptions.minRcsScore !== undefined) {
      filtered = filtered.filter(
        (ref) => ref.rcsScore.overall >= filterOptions.minRcsScore!
      );
    }

    // Filter by search query (in questions/answers)
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase();
      filtered = filtered.filter((ref) => {
        const hasMatchInQuestions = ref.questions.some((q) =>
          q.text.toLowerCase().includes(query)
        );
        const hasMatchInAnswers = ref.answers.some((a) =>
          a.answer.toLowerCase().includes(query)
        );
        const hasMatchInReferrer = ref.referrer.name
          ?.toLowerCase()
          .includes(query);
        return hasMatchInQuestions || hasMatchInAnswers || hasMatchInReferrer;
      });
    }

    // Sort references
    const sortBy = filterOptions.sortBy || 'date';
    const sortOrder = filterOptions.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison =
            new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
        case 'rcsScore':
          comparison = a.rcsScore.overall - b.rcsScore.overall;
          break;
        case 'format':
          comparison = a.format.localeCompare(b.format);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }
);

/**
 * Reference Statistics Selectors
 */
export const selectReferencesByFormat = createSelector(
  selectBundleReferences,
  (references) => ({
    video: references.filter((r) => r.format === ReferenceFormat.VIDEO).length,
    audio: references.filter((r) => r.format === ReferenceFormat.AUDIO).length,
    text: references.filter((r) => r.format === ReferenceFormat.TEXT).length,
  })
);

export const selectCompletedReferences = createSelector(
  selectBundleReferences,
  (references) =>
    references.filter((r) => r.status === ReferenceStatus.COMPLETED)
);

export const selectAverageRcsScore = createSelector(
  selectCompletedReferences,
  (references) => {
    if (references.length === 0) return 0;
    const sum = references.reduce((acc, ref) => acc + ref.rcsScore.overall, 0);
    return Math.round(sum / references.length);
  }
);

/**
 * Session Selectors
 */
export const selectIsSessionValid = createSelector(
  selectSession,
  (session) => {
    if (!session) return false;
    return session.expiresAt > Date.now();
  }
);

export const selectSessionType = createSelector(
  selectSession,
  (session) => session?.accessType
);

export const selectIsGuestSession = createSelector(
  selectSessionType,
  (accessType) => accessType === 'guest'
);

/**
 * Reach-Back Selectors
 */
export const selectReachBackForReference = (referenceId: string) =>
  createSelector(selectReachBackRequests, (requests) => {
    const requestArray = Array.from(requests.values());
    return requestArray.find((req) =>
      req.requestId.includes(referenceId)
    );
  });

export const selectCanRequestReachBack = (referenceId: string) =>
  createSelector(
    selectBundleReferences,
    selectReachBackRequests,
    (references, requests) => {
      const reference = references.find((r) => r.id === referenceId);
      if (!reference || !reference.allowReachBack) return false;

      // Check if already requested
      const requestArray = Array.from(requests.values());
      const existingRequest = requestArray.find((req) =>
        req.requestId.includes(referenceId)
      );

      return !existingRequest;
    }
  );

/**
 * Analytics Selectors
 */
export const selectViewDuration = createSelector(
  selectAnalytics,
  (analytics) => {
    if (!analytics.viewStartTime) return 0;
    return Math.floor((Date.now() - analytics.viewStartTime) / 1000); // in seconds
  }
);

export const selectPendingAnalyticsEvents = createSelector(
  selectAnalytics,
  (analytics) => analytics.eventsQueue
);

export const selectHasPendingAnalytics = createSelector(
  selectPendingAnalyticsEvents,
  (events) => events.length > 0
);

/**
 * UI State Selectors
 */
export const selectHasBundle = createSelector(
  selectCurrentBundle,
  (bundle) => bundle !== null
);

export const selectHasReferences = createSelector(
  selectBundleReferences,
  (references) => references.length > 0
);

export const selectIsReferenceDetailOpen = createSelector(
  selectCurrentReference,
  (reference) => reference !== null
);

/**
 * Combined Selectors for UI
 */
export const selectBundleViewData = createSelector(
  selectCurrentBundle,
  selectFilteredReferences,
  selectBundleStatistics,
  selectIsSessionValid,
  selectIsExpired,
  (bundle, references, statistics, isSessionValid, isExpired) => ({
    bundle,
    references,
    statistics,
    isSessionValid,
    isExpired,
    canView: bundle !== null && isSessionValid && !isExpired,
  })
);

export const selectReferenceDetailData = createSelector(
  selectCurrentReference,
  selectBundleSettings,
  selectIsSessionValid,
  (reference, settings, isSessionValid) => ({
    reference,
    settings,
    isSessionValid,
    canView: reference !== null && isSessionValid,
  })
);
