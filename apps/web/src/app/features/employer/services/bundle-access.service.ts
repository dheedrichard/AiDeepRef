/**
 * Bundle Access Service
 *
 * Handles bundle access authentication and session management.
 * Supports both guest (anonymous) and authenticated access.
 * Manages password protection and session expiration.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  BundleAccessRequest,
  BundleAccessResponse,
  BundleAccessSession,
  BundleAccessType,
} from '../models/employer.models';

/**
 * Storage keys for bundle access data
 */
const STORAGE_KEYS = {
  SESSION: 'deepref_bundle_session',
  VIEWER_EMAIL: 'deepref_viewer_email',
} as const;

@Injectable({
  providedIn: 'root',
})
export class BundleAccessService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1';

  /**
   * Request Bundle Access
   * Handles password validation and session creation
   */
  requestAccess(request: BundleAccessRequest): Observable<BundleAccessResponse> {
    return this.http.post<BundleAccessResponse>(
      `${this.apiUrl}/bundles/access`,
      request
    );
  }

  /**
   * Verify Bundle Password
   * Checks if provided password is correct
   */
  verifyPassword(bundleId: string, password: string): Observable<boolean> {
    return this.http
      .post<{ valid: boolean }>(`${this.apiUrl}/bundles/${bundleId}/verify-password`, {
        password,
      })
      .pipe(
        map((response) => response.valid),
        catchError(() => of(false))
      );
  }

  /**
   * Extract Bundle ID from Share Link
   */
  extractBundleIdFromLink(shareLink: string): string | null {
    try {
      // Support various link formats:
      // - https://deepref.com/b/abc123
      // - https://deepref.com/bundles/abc123
      // - abc123 (direct ID)
      const patterns = [
        /\/b\/([a-zA-Z0-9_-]+)/,
        /\/bundles\/([a-zA-Z0-9_-]+)/,
        /^([a-zA-Z0-9_-]+)$/,
      ];

      for (const pattern of patterns) {
        const match = shareLink.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting bundle ID:', error);
      return null;
    }
  }

  /**
   * Save Session to Local Storage
   */
  saveSession(session: BundleAccessSession): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

      // Save viewer email separately for convenience
      if (session.viewerEmail) {
        localStorage.setItem(STORAGE_KEYS.VIEWER_EMAIL, session.viewerEmail);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Load Session from Storage
   */
  loadSession(): BundleAccessSession | null {
    try {
      const sessionStr = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr) as BundleAccessSession;

      // Check if session is expired
      if (this.isSessionExpired(session)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear Session from Storage
   */
  clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  /**
   * Check if Session is Expired
   */
  isSessionExpired(session: BundleAccessSession): boolean {
    return session.expiresAt < Date.now();
  }

  /**
   * Check if Session is Valid
   */
  isSessionValid(): boolean {
    const session = this.loadSession();
    return session !== null && !this.isSessionExpired(session);
  }

  /**
   * Get Current Session
   */
  getCurrentSession(): BundleAccessSession | null {
    return this.loadSession();
  }

  /**
   * Get Saved Viewer Email (for guest users)
   */
  getSavedViewerEmail(): string | null {
    return localStorage.getItem(STORAGE_KEYS.VIEWER_EMAIL);
  }

  /**
   * Clear Saved Viewer Email
   */
  clearSavedViewerEmail(): void {
    localStorage.removeItem(STORAGE_KEYS.VIEWER_EMAIL);
  }

  /**
   * Create Guest Session
   * For bundles without password protection
   */
  createGuestSession(bundleId: string, viewerEmail?: string): BundleAccessSession {
    const sessionId = this.generateSessionId();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return {
      bundleId,
      accessType: BundleAccessType.GUEST,
      sessionId,
      expiresAt,
      viewerEmail,
    };
  }

  /**
   * Extend Session
   * Refresh session expiration time
   */
  extendSession(session: BundleAccessSession, hours: number = 24): BundleAccessSession {
    const extendedSession = {
      ...session,
      expiresAt: Date.now() + hours * 60 * 60 * 1000,
    };
    this.saveSession(extendedSession);
    return extendedSession;
  }

  /**
   * Generate Session ID
   */
  private generateSessionId(): string {
    return (
      'session_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Validate Bundle ID Format
   */
  isValidBundleId(bundleId: string): boolean {
    // Check if bundle ID matches expected format
    return /^[a-zA-Z0-9_-]{8,}$/.test(bundleId);
  }

  /**
   * Get Session Expiration Time Remaining (in seconds)
   */
  getTimeRemaining(session: BundleAccessSession): number {
    const remaining = Math.floor((session.expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Format Time Remaining as Human Readable String
   */
  formatTimeRemaining(session: BundleAccessSession): string {
    const seconds = this.getTimeRemaining(session);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return '<1m';
  }
}
