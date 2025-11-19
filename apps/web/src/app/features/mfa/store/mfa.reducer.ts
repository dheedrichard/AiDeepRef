import { createReducer, on } from '@ngrx/store';
import * as MfaActions from './mfa.actions';
import { MfaStatus, MfaSetupResponse, TrustedDevice } from '../models/mfa.models';

export interface MfaState {
  status: MfaStatus | null;
  setup: MfaSetupResponse | null;
  backupCodes: string[] | null;
  trustedDevices: TrustedDevice[];
  loading: boolean;
  error: any | null;
}

export const initialState: MfaState = {
  status: null,
  setup: null,
  backupCodes: null,
  trustedDevices: [],
  loading: false,
  error: null,
};

export const mfaReducer = createReducer(
  initialState,

  // Setup
  on(MfaActions.setupMfa, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.setupMfaSuccess, (state, { setup }) => ({
    ...state,
    setup,
    loading: false,
    error: null,
  })),
  on(MfaActions.setupMfaFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Verify
  on(MfaActions.verifyMfa, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.verifyMfaSuccess, (state, { backupCodes }) => ({
    ...state,
    backupCodes,
    loading: false,
    error: null,
  })),
  on(MfaActions.verifyMfaFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Status
  on(MfaActions.loadMfaStatus, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.loadMfaStatusSuccess, (state, { status }) => ({
    ...state,
    status,
    loading: false,
    error: null,
  })),
  on(MfaActions.loadMfaStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Disable
  on(MfaActions.disableMfa, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.disableMfaSuccess, (state) => ({
    ...state,
    status: {
      enabled: false,
      verified: false,
      method: null,
      hasBackupCodes: false,
      trustedDevicesCount: 0,
    },
    setup: null,
    backupCodes: null,
    trustedDevices: [],
    loading: false,
    error: null,
  })),
  on(MfaActions.disableMfaFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Backup Codes
  on(MfaActions.regenerateBackupCodes, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.regenerateBackupCodesSuccess, (state, { backupCodes }) => ({
    ...state,
    backupCodes,
    loading: false,
    error: null,
  })),
  on(MfaActions.regenerateBackupCodesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Trusted Devices
  on(MfaActions.loadTrustedDevices, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.loadTrustedDevicesSuccess, (state, { devices }) => ({
    ...state,
    trustedDevices: devices,
    loading: false,
    error: null,
  })),
  on(MfaActions.loadTrustedDevicesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(MfaActions.trustDevice, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.trustDeviceSuccess, (state, { device }) => ({
    ...state,
    trustedDevices: [...state.trustedDevices, device],
    loading: false,
    error: null,
  })),
  on(MfaActions.trustDeviceFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(MfaActions.revokeTrustedDevice, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MfaActions.revokeTrustedDeviceSuccess, (state, { deviceId }) => ({
    ...state,
    trustedDevices: state.trustedDevices.filter((device) => device.id !== deviceId),
    loading: false,
    error: null,
  })),
  on(MfaActions.revokeTrustedDeviceFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Clear backup codes
  on(MfaActions.clearBackupCodes, (state) => ({
    ...state,
    backupCodes: null,
  }))
);
