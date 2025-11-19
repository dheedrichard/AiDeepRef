import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MfaStatus,
  MfaSetupResponse,
  MfaVerifyResponse,
  MfaChallengeResponse,
  TrustedDevice,
  MfaSetupRequest,
  MfaVerifyRequest,
  DisableMfaRequest,
  MfaMethod,
} from '../models/mfa.models';

@Injectable({
  providedIn: 'root',
})
export class MfaService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/mfa`;
  private readonly authApiUrl = `${environment.apiUrl}/api/v1/auth/mfa`;

  constructor(private http: HttpClient) {}

  /**
   * Setup TOTP for user
   */
  setupTotp(request: MfaSetupRequest = {}): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(`${this.apiUrl}/setup/totp`, request);
  }

  /**
   * Verify TOTP code and enable MFA
   */
  verifyTotp(code: string): Observable<{ verified: boolean; backupCodes: string[] }> {
    return this.http.post<{ verified: boolean; backupCodes: string[] }>(
      `${this.apiUrl}/verify/totp`,
      { code }
    );
  }

  /**
   * Get MFA status
   */
  getMfaStatus(): Observable<MfaStatus> {
    return this.http.get<MfaStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes(): Observable<{ backupCodes: string[]; message: string }> {
    return this.http.post<{ backupCodes: string[]; message: string }>(
      `${this.apiUrl}/backup-codes/regenerate`,
      {}
    );
  }

  /**
   * Disable MFA
   */
  disableMfa(request: DisableMfaRequest): Observable<{ disabled: boolean; message: string }> {
    return this.http.request<{ disabled: boolean; message: string }>(
      'delete',
      `${this.apiUrl}/disable`,
      { body: request }
    );
  }

  /**
   * Get trusted devices
   */
  getTrustedDevices(): Observable<TrustedDevice[]> {
    return this.http.get<TrustedDevice[]>(`${this.apiUrl}/devices`);
  }

  /**
   * Trust current device
   */
  trustDevice(deviceName?: string): Observable<TrustedDevice> {
    return this.http.post<TrustedDevice>(`${this.apiUrl}/devices/trust`, { deviceName });
  }

  /**
   * Revoke trusted device
   */
  revokeTrustedDevice(deviceId: string): Observable<{ revoked: boolean; message: string }> {
    return this.http.delete<{ revoked: boolean; message: string }>(
      `${this.apiUrl}/devices/${deviceId}`
    );
  }

  /**
   * Revoke all trusted devices
   */
  revokeAllTrustedDevices(): Observable<{ revoked: boolean; count: number; message: string }> {
    return this.http.delete<{ revoked: boolean; count: number; message: string }>(
      `${this.apiUrl}/devices`
    );
  }

  /**
   * Create MFA challenge (for login)
   */
  createChallenge(userId: string, type: MfaMethod): Observable<MfaChallengeResponse> {
    return this.http.post<MfaChallengeResponse>(`${this.authApiUrl}/challenge`, { userId, type });
  }

  /**
   * Verify MFA challenge (during login)
   */
  verifyMfaChallenge(request: MfaVerifyRequest): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(`${this.authApiUrl}/verify`, request);
  }

  /**
   * Verify backup code (during login)
   */
  verifyBackupCode(userId: string, code: string): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(`${this.authApiUrl}/backup-code`, { userId, code });
  }
}
