/**
 * Auth Service
 *
 * Handles all authentication-related API calls and local storage operations.
 * Provides methods for signup, signin, email verification, and KYC processes.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  SignUpRequest,
  SignUpResponse,
  SignInRequest,
  SignInResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  KycDocumentUploadRequest,
  KycDocumentUploadResponse,
  KycSelfieUploadRequest,
  KycSelfieUploadResponse,
  KycVerificationResult,
  User,
  AuthToken,
} from '../models/auth.models';

/**
 * Storage keys for auth data
 */
const STORAGE_KEYS = {
  USER: 'deepref_user',
  TOKEN: 'deepref_token',
  KEEP_SIGNED_IN: 'deepref_keep_signed_in',
} as const;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/auth';

  /**
   * Sign up a new user
   */
  signUp(request: SignUpRequest): Observable<SignUpResponse> {
    return this.http.post<SignUpResponse>(`${this.apiUrl}/signup`, request);
  }

  /**
   * Sign in with magic link
   */
  signIn(request: SignInRequest): Observable<SignInResponse> {
    return this.http.post<SignInResponse>(`${this.apiUrl}/signin`, request);
  }

  /**
   * Resend magic link
   */
  resendMagicLink(email: string): Observable<SignInResponse> {
    return this.http.post<SignInResponse>(`${this.apiUrl}/signin/resend`, { email });
  }

  /**
   * Verify email with token
   */
  verifyEmail(request: VerifyEmailRequest): Observable<VerifyEmailResponse> {
    return this.http.post<VerifyEmailResponse>(`${this.apiUrl}/verify-email`, request);
  }

  /**
   * Upload KYC documents
   */
  uploadKycDocuments(
    request: KycDocumentUploadRequest
  ): Observable<KycDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('documentType', request.documentType);
    formData.append('frontImage', request.frontImage);
    if (request.backImage) {
      formData.append('backImage', request.backImage);
    }
    formData.append('consent', String(request.consent));

    return this.http.post<KycDocumentUploadResponse>(
      `/api/v1/seekers/${request.userId}/kyc/upload`,
      formData
    );
  }

  /**
   * Upload KYC selfie
   */
  uploadKycSelfie(request: KycSelfieUploadRequest): Observable<KycSelfieUploadResponse> {
    const formData = new FormData();
    formData.append('selfieImage', request.selfieImage);
    if (request.livenessData) {
      formData.append('livenessData', JSON.stringify(request.livenessData));
    }

    return this.http.post<KycSelfieUploadResponse>(
      `/api/v1/seekers/${request.userId}/kyc/selfie`,
      formData
    );
  }

  /**
   * Check KYC verification status
   */
  checkKycStatus(userId: string): Observable<KycVerificationResult> {
    return this.http.get<KycVerificationResult>(`/api/v1/seekers/${userId}/kyc/status`);
  }

  /**
   * Save user and token to local storage
   */
  saveToStorage(user: User, token: AuthToken, keepSignedIn: boolean): void {
    const storage = keepSignedIn ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    storage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token));
    storage.setItem(STORAGE_KEYS.KEEP_SIGNED_IN, String(keepSignedIn));
  }

  /**
   * Load user and token from storage
   */
  loadFromStorage(): { user: User; token: AuthToken } | null {
    // Check localStorage first (for keep signed in)
    let userStr = localStorage.getItem(STORAGE_KEYS.USER);
    let tokenStr = localStorage.getItem(STORAGE_KEYS.TOKEN);

    // If not in localStorage, check sessionStorage
    if (!userStr || !tokenStr) {
      userStr = sessionStorage.getItem(STORAGE_KEYS.USER);
      tokenStr = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    if (!userStr || !tokenStr) {
      return null;
    }

    try {
      const user = JSON.parse(userStr) as User;
      const token = JSON.parse(tokenStr) as AuthToken;

      // Check if token is expired
      if (this.isTokenExpired(token)) {
        this.clearStorage();
        return null;
      }

      return { user, token };
    } catch (error) {
      console.error('Error parsing stored auth data:', error);
      this.clearStorage();
      return null;
    }
  }

  /**
   * Clear auth data from storage
   */
  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.KEEP_SIGNED_IN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.KEEP_SIGNED_IN);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: AuthToken): boolean {
    if (!token.expiresAt) {
      return false;
    }
    const now = Date.now();
    return now >= token.expiresAt;
  }

  /**
   * Get access token from storage
   */
  getAccessToken(): string | null {
    const stored = this.loadFromStorage();
    return stored?.token.accessToken ?? null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.loadFromStorage() !== null;
  }
}
