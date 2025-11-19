/**
 * Bundle API Service
 *
 * Handles all bundle-related API calls.
 * Provides methods for creating, retrieving, updating, and managing bundles.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Bundle,
  CreateBundlePayload,
  UpdateBundlePayload,
  BundleAnalytics,
} from '../models/seeker.models';
import { environment } from '../../../../environments/environment';

/**
 * Bundle API Service
 */
@Injectable({
  providedIn: 'root',
})
export class BundleApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/bundles`;

  /**
   * Get All Bundles
   */
  getBundles(): Observable<Bundle[]> {
    return this.http.get<Bundle[]>(this.apiUrl);
  }

  /**
   * Get Single Bundle
   */
  getBundle(bundleId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/${bundleId}`);
  }

  /**
   * Create Bundle
   */
  createBundle(payload: CreateBundlePayload): Observable<Bundle> {
    return this.http.post<Bundle>(this.apiUrl, payload);
  }

  /**
   * Update Bundle
   */
  updateBundle(
    bundleId: string,
    payload: UpdateBundlePayload
  ): Observable<Bundle> {
    return this.http.patch<Bundle>(`${this.apiUrl}/${bundleId}`, payload);
  }

  /**
   * Delete Bundle
   */
  deleteBundle(bundleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${bundleId}`);
  }

  /**
   * Get Bundle Analytics
   */
  getBundleAnalytics(bundleId: string): Observable<BundleAnalytics> {
    return this.http.get<BundleAnalytics>(`${this.apiUrl}/${bundleId}/analytics`);
  }

  /**
   * Download Bundle
   */
  downloadBundle(bundleId: string, format: 'pdf' | 'json'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${bundleId}/download`, {
      params: { format },
      responseType: 'blob',
    });
  }
}
