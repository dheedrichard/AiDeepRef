/**
 * Referrer Selectors
 *
 * NgRx selectors for accessing referrer state.
 * Provides memoized state slices for components.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ReferrerState } from '../models/referrer.models';
import { referrerFeatureKey } from './referrer.reducer';

/**
 * Select Referrer Feature State
 */
export const selectReferrerState = createFeatureSelector<ReferrerState>(referrerFeatureKey);

/**
 * Select All Requests
 */
export const selectAllRequests = createSelector(
  selectReferrerState,
  (state) => state.requests
);

/**
 * Select Pending Requests
 */
export const selectPendingRequests = createSelector(selectAllRequests, (requests) =>
  requests.filter((r) => r.status === 'pending')
);

/**
 * Select Accepted Requests
 */
export const selectAcceptedRequests = createSelector(selectAllRequests, (requests) =>
  requests.filter((r) => r.status === 'accepted')
);

/**
 * Select Selected Request
 */
export const selectSelectedRequest = createSelector(
  selectReferrerState,
  (state) => state.selectedRequest
);

/**
 * Select Completed References
 */
export const selectCompletedReferences = createSelector(
  selectReferrerState,
  (state) => state.completedReferences
);

/**
 * Select Draft Responses
 */
export const selectDraftResponses = createSelector(
  selectReferrerState,
  (state) => state.draftResponses
);

/**
 * Select Draft for Request
 */
export const selectDraftForRequest = (requestId: string) =>
  createSelector(selectDraftResponses, (drafts) => drafts.get(requestId) || null);

/**
 * Select Statistics
 */
export const selectStatistics = createSelector(selectReferrerState, (state) => state.stats);

/**
 * Select Notifications
 */
export const selectNotifications = createSelector(
  selectReferrerState,
  (state) => state.notifications
);

/**
 * Select Unread Notifications Count
 */
export const selectUnreadCount = createSelector(
  selectReferrerState,
  (state) => state.unreadCount
);

/**
 * Select Unread Notifications
 */
export const selectUnreadNotifications = createSelector(selectNotifications, (notifications) =>
  notifications.filter((n) => !n.read)
);

/**
 * Select Upload Progress
 */
export const selectUploadProgress = createSelector(
  selectReferrerState,
  (state) => state.uploads
);

/**
 * Select Active Uploads
 */
export const selectActiveUploads = createSelector(selectUploadProgress, (uploads) => {
  const activeUploads: any[] = [];
  uploads.forEach((upload) => {
    if (upload.status === 'uploading' || upload.status === 'pending') {
      activeUploads.push(upload);
    }
  });
  return activeUploads;
});

/**
 * Select Is Loading
 */
export const selectIsLoading = createSelector(
  selectReferrerState,
  (state) => state.isLoading
);

/**
 * Select Is Submitting
 */
export const selectIsSubmitting = createSelector(
  selectReferrerState,
  (state) => state.isSubmitting
);

/**
 * Select Error
 */
export const selectError = createSelector(selectReferrerState, (state) => state.error);

/**
 * Select Has Pending Requests
 */
export const selectHasPendingRequests = createSelector(
  selectPendingRequests,
  (requests) => requests.length > 0
);

/**
 * Select Total Requests Count
 */
export const selectTotalRequestsCount = createSelector(
  selectAllRequests,
  (requests) => requests.length
);

/**
 * Select Completed References Count
 */
export const selectCompletedReferencesCount = createSelector(
  selectCompletedReferences,
  (references) => references.length
);
