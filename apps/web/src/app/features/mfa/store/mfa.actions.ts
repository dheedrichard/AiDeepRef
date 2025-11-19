import { createAction, props } from '@ngrx/store';
import {
  MfaStatus,
  MfaSetupResponse,
  TrustedDevice,
  MfaMethod,
} from '../models/mfa.models';

// Setup Actions
export const setupMfa = createAction('[MFA] Setup MFA', props<{ method?: MfaMethod }>());
export const setupMfaSuccess = createAction(
  '[MFA] Setup MFA Success',
  props<{ setup: MfaSetupResponse }>()
);
export const setupMfaFailure = createAction('[MFA] Setup MFA Failure', props<{ error: any }>());

// Verify Actions
export const verifyMfa = createAction('[MFA] Verify MFA', props<{ code: string }>());
export const verifyMfaSuccess = createAction(
  '[MFA] Verify MFA Success',
  props<{ backupCodes: string[] }>()
);
export const verifyMfaFailure = createAction('[MFA] Verify MFA Failure', props<{ error: any }>());

// Status Actions
export const loadMfaStatus = createAction('[MFA] Load MFA Status');
export const loadMfaStatusSuccess = createAction(
  '[MFA] Load MFA Status Success',
  props<{ status: MfaStatus }>()
);
export const loadMfaStatusFailure = createAction(
  '[MFA] Load MFA Status Failure',
  props<{ error: any }>()
);

// Disable Actions
export const disableMfa = createAction('[MFA] Disable MFA', props<{ password: string }>());
export const disableMfaSuccess = createAction('[MFA] Disable MFA Success');
export const disableMfaFailure = createAction('[MFA] Disable MFA Failure', props<{ error: any }>());

// Backup Codes Actions
export const regenerateBackupCodes = createAction('[MFA] Regenerate Backup Codes');
export const regenerateBackupCodesSuccess = createAction(
  '[MFA] Regenerate Backup Codes Success',
  props<{ backupCodes: string[] }>()
);
export const regenerateBackupCodesFailure = createAction(
  '[MFA] Regenerate Backup Codes Failure',
  props<{ error: any }>()
);

// Trusted Devices Actions
export const loadTrustedDevices = createAction('[MFA] Load Trusted Devices');
export const loadTrustedDevicesSuccess = createAction(
  '[MFA] Load Trusted Devices Success',
  props<{ devices: TrustedDevice[] }>()
);
export const loadTrustedDevicesFailure = createAction(
  '[MFA] Load Trusted Devices Failure',
  props<{ error: any }>()
);

export const trustDevice = createAction(
  '[MFA] Trust Device',
  props<{ deviceName?: string }>()
);
export const trustDeviceSuccess = createAction(
  '[MFA] Trust Device Success',
  props<{ device: TrustedDevice }>()
);
export const trustDeviceFailure = createAction(
  '[MFA] Trust Device Failure',
  props<{ error: any }>()
);

export const revokeTrustedDevice = createAction(
  '[MFA] Revoke Trusted Device',
  props<{ deviceId: string }>()
);
export const revokeTrustedDeviceSuccess = createAction(
  '[MFA] Revoke Trusted Device Success',
  props<{ deviceId: string }>()
);
export const revokeTrustedDeviceFailure = createAction(
  '[MFA] Revoke Trusted Device Failure',
  props<{ error: any }>()
);

// Clear backup codes (after user has seen them)
export const clearBackupCodes = createAction('[MFA] Clear Backup Codes');
