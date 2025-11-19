/**
 * Referrer Reducer
 *
 * Manages referrer state using NgRx.
 * Handles all referrer-related state mutations.
 */

import { createReducer, on } from '@ngrx/store';
import { ReferrerState } from '../models/referrer.models';
import { ReferrerActions } from './referrer.actions';

/**
 * Initial Referrer State
 */
export const initialReferrerState: ReferrerState = {
  requests: [],
  selectedRequest: null,
  completedReferences: [],
  draftResponses: new Map(),
  stats: null,
  notifications: [],
  unreadCount: 0,
  uploads: new Map(),
  isLoading: false,
  isSubmitting: false,
  error: null,
};

/**
 * Referrer Feature Key
 */
export const referrerFeatureKey = 'referrer';

/**
 * Referrer Reducer
 */
export const referrerReducer = createReducer(
  initialReferrerState,

  // Load Requests
  on(ReferrerActions.loadRequests, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.loadRequestsSuccess, (state, { requests }) => ({
    ...state,
    requests,
    isLoading: false,
  })),
  on(ReferrerActions.loadRequestsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Load Single Request
  on(ReferrerActions.loadRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.loadRequestSuccess, (state, { request }) => ({
    ...state,
    selectedRequest: request,
    isLoading: false,
  })),
  on(ReferrerActions.loadRequestFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Accept Request
  on(ReferrerActions.acceptRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.acceptRequestSuccess, (state, { request }) => ({
    ...state,
    selectedRequest: request,
    requests: state.requests.map((r) => (r.id === request.id ? request : r)),
    isLoading: false,
  })),
  on(ReferrerActions.acceptRequestFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Decline Request
  on(ReferrerActions.declineRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.declineRequestSuccess, (state, { requestId }) => ({
    ...state,
    requests: state.requests.filter((r) => r.id !== requestId),
    selectedRequest: state.selectedRequest?.id === requestId ? null : state.selectedRequest,
    isLoading: false,
  })),
  on(ReferrerActions.declineRequestFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Submit Response
  on(ReferrerActions.submitResponse, (state) => ({
    ...state,
    isSubmitting: true,
    error: null,
  })),
  on(ReferrerActions.submitResponseSuccess, (state, { response }) => {
    const updatedDrafts = new Map(state.draftResponses);
    updatedDrafts.delete(response.referenceId);
    return {
      ...state,
      draftResponses: updatedDrafts,
      isSubmitting: false,
    };
  }),
  on(ReferrerActions.submitResponseFailure, (state, { error }) => ({
    ...state,
    isSubmitting: false,
    error,
  })),

  // Save Draft
  on(ReferrerActions.saveDraft, (state) => ({
    ...state,
    error: null,
  })),
  on(ReferrerActions.saveDraftSuccess, (state, { draft }) => {
    const updatedDrafts = new Map(state.draftResponses);
    updatedDrafts.set(draft.referenceRequestId, draft);
    return {
      ...state,
      draftResponses: updatedDrafts,
    };
  }),
  on(ReferrerActions.saveDraftFailure, (state, { error }) => ({
    ...state,
    error,
  })),

  // Load Draft
  on(ReferrerActions.loadDraft, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.loadDraftSuccess, (state, { draft }) => {
    if (!draft) {
      return {
        ...state,
        isLoading: false,
      };
    }
    const updatedDrafts = new Map(state.draftResponses);
    updatedDrafts.set(draft.referenceRequestId, draft);
    return {
      ...state,
      draftResponses: updatedDrafts,
      isLoading: false,
    };
  }),
  on(ReferrerActions.loadDraftFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Upload Media
  on(ReferrerActions.uploadMedia, (state, { payload }) => {
    const updatedUploads = new Map(state.uploads);
    updatedUploads.set(payload.file.name, {
      fileId: payload.file.name,
      fileName: payload.file.name,
      progress: 0,
      status: 'pending',
    });
    return {
      ...state,
      uploads: updatedUploads,
    };
  }),
  on(ReferrerActions.uploadMediaProgress, (state, { progress }) => {
    const updatedUploads = new Map(state.uploads);
    updatedUploads.set(progress.fileId, progress);
    return {
      ...state,
      uploads: updatedUploads,
    };
  }),
  on(ReferrerActions.uploadMediaSuccess, (state, { response }) => {
    const updatedUploads = new Map(state.uploads);
    updatedUploads.delete(response.fileId);
    return {
      ...state,
      uploads: updatedUploads,
    };
  }),
  on(ReferrerActions.uploadMediaFailure, (state, { fileId, error }) => {
    const updatedUploads = new Map(state.uploads);
    const upload = updatedUploads.get(fileId);
    if (upload) {
      updatedUploads.set(fileId, {
        ...upload,
        status: 'failed',
        error,
      });
    }
    return {
      ...state,
      uploads: updatedUploads,
    };
  }),

  // Load Completed References
  on(ReferrerActions.loadCompletedReferences, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.loadCompletedReferencesSuccess, (state, { references }) => ({
    ...state,
    completedReferences: references,
    isLoading: false,
  })),
  on(ReferrerActions.loadCompletedReferencesFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Load Statistics
  on(ReferrerActions.loadStatistics, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferrerActions.loadStatisticsSuccess, (state, { stats }) => ({
    ...state,
    stats,
    isLoading: false,
  })),
  on(ReferrerActions.loadStatisticsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Load Notifications
  on(ReferrerActions.loadNotifications, (state) => ({
    ...state,
    error: null,
  })),
  on(ReferrerActions.loadNotificationsSuccess, (state, { notifications }) => ({
    ...state,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  })),
  on(ReferrerActions.loadNotificationsFailure, (state, { error }) => ({
    ...state,
    error,
  })),

  // Mark Notification as Read
  on(ReferrerActions.markNotificationRead, (state) => ({
    ...state,
    error: null,
  })),
  on(ReferrerActions.markNotificationReadSuccess, (state, { notificationId }) => {
    const updatedNotifications = state.notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    return {
      ...state,
      notifications: updatedNotifications,
      unreadCount: updatedNotifications.filter((n) => !n.read).length,
    };
  }),
  on(ReferrerActions.markNotificationReadFailure, (state, { error }) => ({
    ...state,
    error,
  })),

  // Clear Error
  on(ReferrerActions.clearError, (state) => ({
    ...state,
    error: null,
  })),

  // Clear Selected Request
  on(ReferrerActions.clearSelectedRequest, (state) => ({
    ...state,
    selectedRequest: null,
  }))
);
