export enum MfaMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
}

export interface MfaStatus {
  enabled: boolean;
  verified: boolean;
  method: MfaMethod | null;
  hasBackupCodes: boolean;
  trustedDevicesCount: number;
  phoneNumber?: string | null;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}

export interface MfaVerifyResponse {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
  deviceTrusted?: boolean;
}

export interface MfaChallengeResponse {
  challengeId: string;
  expiresAt: Date;
  method: MfaMethod;
  message?: string;
}

export interface TrustedDevice {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  trustedAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
}

export interface MfaSetupRequest {
  method?: MfaMethod;
}

export interface MfaVerifyRequest {
  challengeId: string;
  code: string;
  trustDevice?: boolean;
  deviceName?: string;
}

export interface DisableMfaRequest {
  password: string;
}
