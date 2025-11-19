/**
 * Seeker Reducer
 *
 * Manages seeker state using NgRx.
 * Handles all seeker-related state mutations.
 */

import { createReducer, on } from '@ngrx/store';
import { SeekerState } from '../models/seeker.models';
import {
  DashboardActions,
  ReferenceRequestActions,
  ReferenceActions,
  BundleActions,
  SeekerUIActions,
} from './seeker.actions';

/**
 * Initial Seeker State
 */
export const initialSeekerState: SeekerState = {
  // Dashboard
  dashboardStats: null,
  recentActivity: [],

  // Reference Requests
  requests: [],
  selectedRequest: null,

  // References
  references: [],
  selectedReference: null,
  referenceFilters: {},

  // Bundles
  bundles: [],
  selectedBundle: null,

  // UI State
  isLoading: false,
  isLoadingRequests: false,
  isLoadingReferences: false,
  isLoadingBundles: false,
  error: null,
};

/**
 * Seeker Feature Key
 */
export const seekerFeatureKey = 'seeker';

/**
 * Seeker Reducer
 */
export const seekerReducer = createReducer(
  initialSeekerState,

  // ========== Dashboard Actions ==========
  on(DashboardActions.loadDashboard, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(DashboardActions.loadDashboardSuccess, (state, { stats, recentActivity }) => ({
    ...state,
    dashboardStats: stats,
    recentActivity,
    isLoading: false,
    error: null,
  })),
  on(DashboardActions.loadDashboardFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  on(DashboardActions.refreshActivity, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(DashboardActions.refreshActivitySuccess, (state, { recentActivity }) => ({
    ...state,
    recentActivity,
    isLoading: false,
  })),
  on(DashboardActions.refreshActivityFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // ========== Reference Request Actions ==========
  on(ReferenceRequestActions.loadRequests, (state) => ({
    ...state,
    isLoadingRequests: true,
    error: null,
  })),
  on(ReferenceRequestActions.loadRequestsSuccess, (state, { requests }) => ({
    ...state,
    requests,
    isLoadingRequests: false,
    error: null,
  })),
  on(ReferenceRequestActions.loadRequestsFailure, (state, { error }) => ({
    ...state,
    isLoadingRequests: false,
    error,
  })),

  on(ReferenceRequestActions.loadRequest, (state) => ({
    ...state,
    isLoadingRequests: true,
    error: null,
  })),
  on(ReferenceRequestActions.loadRequestSuccess, (state, { request }) => ({
    ...state,
    selectedRequest: request,
    requests: [...state.requests.filter((r) => r.id !== request.id), request],
    isLoadingRequests: false,
    error: null,
  })),
  on(ReferenceRequestActions.loadRequestFailure, (state, { error }) => ({
    ...state,
    isLoadingRequests: false,
    error,
  })),

  on(ReferenceRequestActions.createRequest, (state) => ({
    ...state,
    isLoadingRequests: true,
    error: null,
  })),
  on(ReferenceRequestActions.createRequestSuccess, (state, { request }) => ({
    ...state,
    requests: [...state.requests, request],
    isLoadingRequests: false,
    error: null,
  })),
  on(ReferenceRequestActions.createRequestFailure, (state, { error }) => ({
    ...state,
    isLoadingRequests: false,
    error,
  })),

  on(ReferenceRequestActions.deleteRequest, (state) => ({
    ...state,
    isLoadingRequests: true,
    error: null,
  })),
  on(ReferenceRequestActions.deleteRequestSuccess, (state, { requestId }) => ({
    ...state,
    requests: state.requests.filter((r) => r.id !== requestId),
    selectedRequest:
      state.selectedRequest?.id === requestId ? null : state.selectedRequest,
    isLoadingRequests: false,
    error: null,
  })),
  on(ReferenceRequestActions.deleteRequestFailure, (state, { error }) => ({
    ...state,
    isLoadingRequests: false,
    error,
  })),

  on(ReferenceRequestActions.generateQuestions, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferenceRequestActions.generateQuestionsSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),
  on(ReferenceRequestActions.generateQuestionsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  on(ReferenceRequestActions.selectRequest, (state, { requestId }) => ({
    ...state,
    selectedRequest: requestId
      ? state.requests.find((r) => r.id === requestId) || null
      : null,
  })),

  // ========== Reference Actions ==========
  on(ReferenceActions.loadReferences, (state) => ({
    ...state,
    isLoadingReferences: true,
    error: null,
  })),
  on(ReferenceActions.loadReferencesSuccess, (state, { references }) => ({
    ...state,
    references,
    isLoadingReferences: false,
    error: null,
  })),
  on(ReferenceActions.loadReferencesFailure, (state, { error }) => ({
    ...state,
    isLoadingReferences: false,
    error,
  })),

  on(ReferenceActions.loadReference, (state) => ({
    ...state,
    isLoadingReferences: true,
    error: null,
  })),
  on(ReferenceActions.loadReferenceSuccess, (state, { reference }) => ({
    ...state,
    selectedReference: reference,
    references: [...state.references.filter((r) => r.id !== reference.id), reference],
    isLoadingReferences: false,
    error: null,
  })),
  on(ReferenceActions.loadReferenceFailure, (state, { error }) => ({
    ...state,
    isLoadingReferences: false,
    error,
  })),

  on(ReferenceActions.downloadReference, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ReferenceActions.downloadReferenceSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),
  on(ReferenceActions.downloadReferenceFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  on(ReferenceActions.applyFilters, (state, { filters }) => ({
    ...state,
    referenceFilters: filters,
  })),
  on(ReferenceActions.clearFilters, (state) => ({
    ...state,
    referenceFilters: {},
  })),

  on(ReferenceActions.selectReference, (state, { referenceId }) => ({
    ...state,
    selectedReference: referenceId
      ? state.references.find((r) => r.id === referenceId) || null
      : null,
  })),

  // ========== Bundle Actions ==========
  on(BundleActions.loadBundles, (state) => ({
    ...state,
    isLoadingBundles: true,
    error: null,
  })),
  on(BundleActions.loadBundlesSuccess, (state, { bundles }) => ({
    ...state,
    bundles,
    isLoadingBundles: false,
    error: null,
  })),
  on(BundleActions.loadBundlesFailure, (state, { error }) => ({
    ...state,
    isLoadingBundles: false,
    error,
  })),

  on(BundleActions.loadBundle, (state) => ({
    ...state,
    isLoadingBundles: true,
    error: null,
  })),
  on(BundleActions.loadBundleSuccess, (state, { bundle }) => ({
    ...state,
    selectedBundle: bundle,
    bundles: [...state.bundles.filter((b) => b.id !== bundle.id), bundle],
    isLoadingBundles: false,
    error: null,
  })),
  on(BundleActions.loadBundleFailure, (state, { error }) => ({
    ...state,
    isLoadingBundles: false,
    error,
  })),

  on(BundleActions.createBundle, (state) => ({
    ...state,
    isLoadingBundles: true,
    error: null,
  })),
  on(BundleActions.createBundleSuccess, (state, { bundle }) => ({
    ...state,
    bundles: [...state.bundles, bundle],
    isLoadingBundles: false,
    error: null,
  })),
  on(BundleActions.createBundleFailure, (state, { error }) => ({
    ...state,
    isLoadingBundles: false,
    error,
  })),

  on(BundleActions.updateBundle, (state) => ({
    ...state,
    isLoadingBundles: true,
    error: null,
  })),
  on(BundleActions.updateBundleSuccess, (state, { bundle }) => ({
    ...state,
    bundles: state.bundles.map((b) => (b.id === bundle.id ? bundle : b)),
    selectedBundle: state.selectedBundle?.id === bundle.id ? bundle : state.selectedBundle,
    isLoadingBundles: false,
    error: null,
  })),
  on(BundleActions.updateBundleFailure, (state, { error }) => ({
    ...state,
    isLoadingBundles: false,
    error,
  })),

  on(BundleActions.deleteBundle, (state) => ({
    ...state,
    isLoadingBundles: true,
    error: null,
  })),
  on(BundleActions.deleteBundleSuccess, (state, { bundleId }) => ({
    ...state,
    bundles: state.bundles.filter((b) => b.id !== bundleId),
    selectedBundle: state.selectedBundle?.id === bundleId ? null : state.selectedBundle,
    isLoadingBundles: false,
    error: null,
  })),
  on(BundleActions.deleteBundleFailure, (state, { error }) => ({
    ...state,
    isLoadingBundles: false,
    error,
  })),

  on(BundleActions.selectBundle, (state, { bundleId }) => ({
    ...state,
    selectedBundle: bundleId
      ? state.bundles.find((b) => b.id === bundleId) || null
      : null,
  })),

  // ========== UI Actions ==========
  on(SeekerUIActions.clearError, (state) => ({
    ...state,
    error: null,
  })),
  on(SeekerUIActions.resetState, () => ({
    ...initialSeekerState,
  }))
);
