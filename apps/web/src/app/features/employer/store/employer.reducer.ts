/**
 * Employer Reducer
 *
 * Manages employer feature state with NgRx signals support.
 * Handles bundle viewing, reference access, and analytics tracking.
 */

import { createReducer, on } from '@ngrx/store';
import { EmployerActions } from './employer.actions';
import { EmployerState, ReferenceFilterOptions } from '../models/employer.models';

/**
 * Initial Filter Options
 */
const initialFilterOptions: ReferenceFilterOptions = {
  sortBy: 'date',
  sortOrder: 'desc',
};

/**
 * Initial Employer State
 */
export const initialState: EmployerState = {
  currentBundle: null,
  currentReference: null,
  session: null,
  isLoading: false,
  error: null,
  filterOptions: initialFilterOptions,
  reachBackRequests: new Map(),
  analytics: {
    viewStartTime: null,
    eventsQueue: [],
  },
};

/**
 * Employer Reducer
 */
export const employerReducer = createReducer(
  initialState,

  // Bundle Access Actions
  on(EmployerActions.requestBundleAccess, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(EmployerActions.requestBundleAccessSuccess, (state, { response }) => ({
    ...state,
    isLoading: false,
    currentBundle: response.bundle,
    session: response.session,
    error: null,
  })),

  on(EmployerActions.requestBundleAccessFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Load Bundle Actions
  on(EmployerActions.loadBundle, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(EmployerActions.loadBundleSuccess, (state, { bundle }) => ({
    ...state,
    isLoading: false,
    currentBundle: bundle,
    error: null,
  })),

  on(EmployerActions.loadBundleFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Reference Actions
  on(EmployerActions.loadReference, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(EmployerActions.loadReferenceSuccess, (state, { reference }) => ({
    ...state,
    isLoading: false,
    currentReference: reference,
    error: null,
  })),

  on(EmployerActions.loadReferenceFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    currentReference: null,
    error,
  })),

  on(EmployerActions.viewReference, (state, { referenceId }) => {
    const reference = state.currentBundle?.references.find((r) => r.id === referenceId);
    return {
      ...state,
      currentReference: reference || null,
    };
  }),

  on(EmployerActions.closeReference, (state) => ({
    ...state,
    currentReference: null,
  })),

  // Filter Actions
  on(EmployerActions.updateFilterOptions, (state, { filterOptions }) => ({
    ...state,
    filterOptions: {
      ...state.filterOptions,
      ...filterOptions,
    },
  })),

  on(EmployerActions.clearFilters, (state) => ({
    ...state,
    filterOptions: initialFilterOptions,
  })),

  // Reach-Back Actions
  on(EmployerActions.requestReachBack, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(EmployerActions.requestReachBackSuccess, (state, { response }) => {
    const newReachBackRequests = new Map(state.reachBackRequests);
    newReachBackRequests.set(response.requestId, response);
    return {
      ...state,
      isLoading: false,
      reachBackRequests: newReachBackRequests,
      error: null,
    };
  }),

  on(EmployerActions.requestReachBackFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Analytics Actions
  on(EmployerActions.startBundleView, (state) => ({
    ...state,
    analytics: {
      ...state.analytics,
      viewStartTime: Date.now(),
    },
  })),

  on(EmployerActions.endBundleView, (state) => ({
    ...state,
    analytics: {
      ...state.analytics,
      viewStartTime: null,
    },
  })),

  on(EmployerActions.trackEvent, (state, { event }) => ({
    ...state,
    analytics: {
      ...state.analytics,
      eventsQueue: [...state.analytics.eventsQueue, event],
    },
  })),

  on(EmployerActions.trackEventSuccess, (state) => ({
    ...state,
    analytics: {
      ...state.analytics,
      eventsQueue: [],
    },
  })),

  // Session Actions
  on(EmployerActions.updateSession, (state, { session }) => ({
    ...state,
    session,
  })),

  on(EmployerActions.clearSession, (state) => ({
    ...state,
    session: null,
    currentBundle: null,
    currentReference: null,
  })),

  on(EmployerActions.sessionExpired, (state) => ({
    ...state,
    session: null,
    error: 'Your session has expired. Please access the bundle again.',
  })),

  // Media Actions
  on(EmployerActions.requestMediaStream, (state) => ({
    ...state,
    isLoading: true,
  })),

  on(EmployerActions.requestMediaStreamSuccess, (state) => ({
    ...state,
    isLoading: false,
  })),

  on(EmployerActions.requestMediaStreamFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Export Actions
  on(EmployerActions.exportBundle, EmployerActions.exportReference, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(EmployerActions.exportSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),

  on(EmployerActions.exportFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Error Handling
  on(EmployerActions.clearError, (state) => ({
    ...state,
    error: null,
  })),

  on(EmployerActions.handleExpiredBundle, (state) => ({
    ...state,
    currentBundle: null,
    currentReference: null,
    session: null,
    error: 'This bundle has expired and is no longer accessible.',
  })),

  on(EmployerActions.handleAccessDenied, (state, { reason }) => ({
    ...state,
    error: `Access denied: ${reason}`,
    isLoading: false,
  }))
);
