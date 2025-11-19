/**
 * Auth Selectors
 *
 * Provides memoized selectors for accessing auth state.
 * Uses createFeatureSelector and createSelector for optimal performance.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState, KycStatus, UserRole } from '../models/auth.models';
import { authFeatureKey } from './auth.reducer';

/**
 * Select the entire auth feature state
 */
export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

/**
 * Select current user
 */
export const selectUser = createSelector(selectAuthState, (state) => state.user);

/**
 * Select auth token
 */
export const selectToken = createSelector(selectAuthState, (state) => state.token);

/**
 * Select authentication status
 */
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated
);

/**
 * Select loading state
 */
export const selectIsLoading = createSelector(selectAuthState, (state) => state.isLoading);

/**
 * Select error
 */
export const selectError = createSelector(selectAuthState, (state) => state.error);

/**
 * Select keep me signed in preference
 */
export const selectKeepMeSignedIn = createSelector(
  selectAuthState,
  (state) => state.keepMeSignedIn
);

/**
 * Select user role
 */
export const selectUserRole = createSelector(selectUser, (user) => user?.role ?? null);

/**
 * Select KYC status
 */
export const selectKycStatus = createSelector(selectUser, (user) => user?.kycStatus ?? null);

/**
 * Select email verification status
 */
export const selectEmailVerified = createSelector(
  selectUser,
  (user) => user?.emailVerified ?? false
);

/**
 * Select if user is a seeker
 */
export const selectIsSeeker = createSelector(
  selectUserRole,
  (role) => role === UserRole.SEEKER
);

/**
 * Select if user is a referrer
 */
export const selectIsReferrer = createSelector(
  selectUserRole,
  (role) => role === UserRole.REFERRER
);

/**
 * Select if user is an employer
 */
export const selectIsEmployer = createSelector(
  selectUserRole,
  (role) => role === UserRole.EMPLOYER
);

/**
 * Select if KYC is verified
 */
export const selectIsKycVerified = createSelector(
  selectKycStatus,
  (status) => status === KycStatus.VERIFIED
);

/**
 * Select if KYC is required (for seekers)
 */
export const selectIsKycRequired = createSelector(
  selectIsSeeker,
  selectKycStatus,
  (isSeeker, kycStatus) => {
    if (!isSeeker) return false;
    return (
      kycStatus === KycStatus.NOT_STARTED ||
      kycStatus === KycStatus.ID_PENDING ||
      kycStatus === KycStatus.SELFIE_PENDING
    );
  }
);

/**
 * Select if KYC needs ID upload
 */
export const selectNeedsIdUpload = createSelector(
  selectKycStatus,
  (status) => status === KycStatus.NOT_STARTED || status === KycStatus.ID_PENDING
);

/**
 * Select if KYC needs selfie upload
 */
export const selectNeedsSelfieUpload = createSelector(
  selectKycStatus,
  (status) => status === KycStatus.SELFIE_PENDING
);

/**
 * Select if KYC is under review
 */
export const selectIsKycUnderReview = createSelector(
  selectKycStatus,
  (status) => status === KycStatus.UNDER_REVIEW
);

/**
 * Select user display name
 */
export const selectUserDisplayName = createSelector(selectUser, (user) => {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`;
});

/**
 * Select user initials
 */
export const selectUserInitials = createSelector(selectUser, (user) => {
  if (!user) return null;
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
});

/**
 * Select if user can access seeker features
 */
export const selectCanAccessSeekerFeatures = createSelector(
  selectIsAuthenticated,
  selectIsSeeker,
  selectIsKycVerified,
  (isAuthenticated, isSeeker, isKycVerified) => {
    return isAuthenticated && isSeeker && isKycVerified;
  }
);
