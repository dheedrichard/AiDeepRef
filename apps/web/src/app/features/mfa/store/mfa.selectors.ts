import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MfaState } from './mfa.reducer';

export const selectMfaState = createFeatureSelector<MfaState>('mfa');

export const selectMfaStatus = createSelector(
  selectMfaState,
  (state) => state.status
);

export const selectMfaSetup = createSelector(
  selectMfaState,
  (state) => state.setup
);

export const selectBackupCodes = createSelector(
  selectMfaState,
  (state) => state.backupCodes
);

export const selectTrustedDevices = createSelector(
  selectMfaState,
  (state) => state.trustedDevices
);

export const selectMfaLoading = createSelector(
  selectMfaState,
  (state) => state.loading
);

export const selectMfaError = createSelector(
  selectMfaState,
  (state) => state.error
);

export const selectIsMfaEnabled = createSelector(
  selectMfaStatus,
  (status) => status?.enabled ?? false
);

export const selectIsMfaVerified = createSelector(
  selectMfaStatus,
  (status) => status?.verified ?? false
);
