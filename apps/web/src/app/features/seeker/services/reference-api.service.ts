/**
 * Reference API Service
 *
 * Handles all reference-related API calls.
 * Provides methods for creating, retrieving, and managing references and requests.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReferenceRequest,
  Reference,
  CreateReferenceRequestPayload,
  ReferenceFilters,
} from '../models/seeker.models';
import { environment } from '../../../../environments/environment';

/**
 * Reference API Service
 */
@Injectable({
  providedIn: 'root',
})
export class ReferenceApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}`;

  /**
   * Get All Reference Requests
   */
  getRequests(): Observable<ReferenceRequest[]> {
    return this.http.get<ReferenceRequest[]>(`${this.apiUrl}/requests`);
  }

  /**
   * Get Single Reference Request
   */
  getRequest(requestId: string): Observable<ReferenceRequest> {
    return this.http.get<ReferenceRequest>(`${this.apiUrl}/requests/${requestId}`);
  }

  /**
   * Create Reference Request
   */
  createRequest(
    payload: CreateReferenceRequestPayload
  ): Observable<ReferenceRequest> {
    return this.http.post<ReferenceRequest>(`${this.apiUrl}/requests`, payload);
  }

  /**
   * Delete Reference Request
   */
  deleteRequest(requestId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/requests/${requestId}`);
  }

  /**
   * Get All References
   */
  getReferences(filters?: ReferenceFilters): Observable<Reference[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) {
        params = params.append('status', filters.status.join(','));
      }
      if (filters.format) {
        params = params.append('format', filters.format.join(','));
      }
      if (filters.minRCS !== undefined) {
        params = params.append('minRCS', filters.minRCS.toString());
      }
      if (filters.maxRCS !== undefined) {
        params = params.append('maxRCS', filters.maxRCS.toString());
      }
      if (filters.dateFrom) {
        params = params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.append('dateTo', filters.dateTo);
      }
      if (filters.searchQuery) {
        params = params.append('search', filters.searchQuery);
      }
    }

    return this.http.get<Reference[]>(`${this.apiUrl}/references`, { params });
  }

  /**
   * Get Single Reference
   */
  getReference(referenceId: string): Observable<Reference> {
    return this.http.get<Reference>(`${this.apiUrl}/references/${referenceId}`);
  }

  /**
   * Download Reference
   */
  downloadReference(referenceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/references/${referenceId}/download`, {
      responseType: 'blob',
    });
  }
}
