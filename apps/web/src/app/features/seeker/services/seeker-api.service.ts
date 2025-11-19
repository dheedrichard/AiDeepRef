/**
 * Seeker API Service
 *
 * Handles all seeker-related API calls.
 * Provides methods for dashboard data, profile, and KYC operations.
 *
 * Extends BaseApiService for automatic TransferState support,
 * preventing duplicate API calls during SSR hydration.
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardStats, RecentActivity } from '../models/seeker.models';
import { environment } from '../../../../environments/environment';
import { BaseApiService } from '../../../core/services/api/base-api.service';

/**
 * Seeker API Service
 */
@Injectable({
  providedIn: 'root',
})
export class SeekerApiService extends BaseApiService {
  private readonly apiUrl = `${environment.apiUrl}/seekers`;

  /**
   * Get Dashboard Data with TransferState support
   */
  getDashboardData(): Observable<{
    stats: DashboardStats;
    recentActivity: RecentActivity[];
  }> {
    return this.getWithTransferState(
      'seeker-dashboard',
      `${this.apiUrl}/dashboard`
    );
  }

  /**
   * Get Recent Activity with TransferState support
   */
  getRecentActivity(): Observable<RecentActivity[]> {
    return this.getWithTransferState(
      'seeker-activity',
      `${this.apiUrl}/activity`
    );
  }

  /**
   * Get Seeker Profile with TransferState support
   */
  getProfile(seekerId: string): Observable<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    kycStatus: string;
  }> {
    return this.getWithTransferState(
      `seeker-profile-${seekerId}`,
      `${this.apiUrl}/${seekerId}/profile`
    );
  }

  /**
   * Upload KYC Documents (uses POST, no TransferState)
   */
  uploadKycDocuments(
    seekerId: string,
    formData: FormData
  ): Observable<{
    uploadId: string;
    status: string;
  }> {
    return this.post<{
      uploadId: string;
      status: string;
    }>(`${this.apiUrl}/${seekerId}/kyc/upload`, formData);
  }

  /**
   * Upload KYC Selfie (uses POST, no TransferState)
   */
  uploadKycSelfie(
    seekerId: string,
    formData: FormData
  ): Observable<{
    verificationId: string;
    status: string;
  }> {
    return this.post<{
      verificationId: string;
      status: string;
    }>(`${this.apiUrl}/${seekerId}/kyc/selfie`, formData);
  }
}
