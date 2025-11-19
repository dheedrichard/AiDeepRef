/**
 * Seeker API Service
 *
 * Handles all seeker-related API calls.
 * Provides methods for dashboard data, profile, and KYC operations.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats, RecentActivity } from '../models/seeker.models';
import { environment } from '../../../../environments/environment';

/**
 * Seeker API Service
 */
@Injectable({
  providedIn: 'root',
})
export class SeekerApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/seekers`;

  /**
   * Get Dashboard Data
   */
  getDashboardData(): Observable<{
    stats: DashboardStats;
    recentActivity: RecentActivity[];
  }> {
    return this.http.get<{
      stats: DashboardStats;
      recentActivity: RecentActivity[];
    }>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Get Recent Activity
   */
  getRecentActivity(): Observable<RecentActivity[]> {
    return this.http.get<RecentActivity[]>(`${this.apiUrl}/activity`);
  }

  /**
   * Get Seeker Profile
   */
  getProfile(seekerId: string): Observable<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    kycStatus: string;
  }> {
    return this.http.get<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      kycStatus: string;
    }>(`${this.apiUrl}/${seekerId}/profile`);
  }

  /**
   * Upload KYC Documents
   */
  uploadKycDocuments(
    seekerId: string,
    formData: FormData
  ): Observable<{
    uploadId: string;
    status: string;
  }> {
    return this.http.post<{
      uploadId: string;
      status: string;
    }>(`${this.apiUrl}/${seekerId}/kyc/upload`, formData);
  }

  /**
   * Upload KYC Selfie
   */
  uploadKycSelfie(
    seekerId: string,
    formData: FormData
  ): Observable<{
    verificationId: string;
    status: string;
  }> {
    return this.http.post<{
      verificationId: string;
      status: string;
    }>(`${this.apiUrl}/${seekerId}/kyc/selfie`, formData);
  }
}
