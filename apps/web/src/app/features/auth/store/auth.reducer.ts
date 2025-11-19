/**
 * Auth Reducer
 *
 * Manages authentication state using NgRx.
 * Handles all auth-related state mutations.
 */

import { createReducer, on } from '@ngrx/store';
import { AuthState, KycStatus } from '../models/auth.models';
import { AuthActions } from './auth.actions';

/**
 * Initial Auth State
 */
export const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  keepMeSignedIn: false,
};

/**
 * Auth Feature Key
 */
export const authFeatureKey = 'auth';

/**
 * Auth Reducer
 */
export const authReducer = createReducer(
  initialAuthState,

  // Sign Up
  on(AuthActions.signUp, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.signUpSuccess, (state, { response }) => ({
    ...state,
    user: response.user,
    token: response.token,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  })),
  on(AuthActions.signUpFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Sign In (Magic Link)
  on(AuthActions.signIn, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.signInSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),
  on(AuthActions.signInFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Resend Magic Link
  on(AuthActions.resendMagicLink, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.resendMagicLinkSuccess, (state) => ({
    ...state,
    isLoading: false,
  })),
  on(AuthActions.resendMagicLinkFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Verify Email
  on(AuthActions.verifyEmail, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.verifyEmailSuccess, (state, { response }) => ({
    ...state,
    user: response.user,
    token: response.token,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  })),
  on(AuthActions.verifyEmailFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Logout
  on(AuthActions.logout, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(AuthActions.logoutSuccess, () => ({
    ...initialAuthState,
  })),

  // Load User from Storage
  on(AuthActions.loadUserFromStorage, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(AuthActions.loadUserFromStorageSuccess, (state, { user, token }) => ({
    ...state,
    user,
    token,
    isAuthenticated: true,
    isLoading: false,
  })),
  on(AuthActions.loadUserFromStorageFailure, (state) => ({
    ...state,
    isLoading: false,
  })),

  // Update User
  on(AuthActions.updateUser, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(AuthActions.updateUserSuccess, (state, { user }) => ({
    ...state,
    user,
    isLoading: false,
  })),

  // Upload KYC Documents
  on(AuthActions.uploadKycDocuments, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.uploadKycDocumentsSuccess, (state, { response }) => ({
    ...state,
    user: state.user
      ? {
          ...state.user,
          kycStatus: response.kycStatus,
        }
      : null,
    isLoading: false,
  })),
  on(AuthActions.uploadKycDocumentsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Upload KYC Selfie
  on(AuthActions.uploadKycSelfie, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(AuthActions.uploadKycSelfieSuccess, (state, { response }) => ({
    ...state,
    user: state.user
      ? {
          ...state.user,
          kycStatus: response.kycStatus,
        }
      : null,
    isLoading: false,
  })),
  on(AuthActions.uploadKycSelfieFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Check KYC Status
  on(AuthActions.checkKycStatus, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(AuthActions.checkKycStatusSuccess, (state, { result }) => ({
    ...state,
    user: state.user
      ? {
          ...state.user,
          kycStatus: result.status,
        }
      : null,
    isLoading: false,
  })),
  on(AuthActions.checkKycStatusFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Clear Error
  on(AuthActions.clearError, (state) => ({
    ...state,
    error: null,
  }))
);
