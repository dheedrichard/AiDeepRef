/**
 * Employer API Service
 *
 * Handles all employer-related API calls including:
 * - Bundle retrieval
 * - Reference access
 * - Reach-back requests
 * - Media streaming
 * - Export functionality
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Bundle,
  Reference,
  ReachBackRequest,
  ReachBackResponse,
} from '../models/employer.models';

@Injectable({
  providedIn: 'root',
})
export class EmployerApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1';

  /**
   * Get Bundle by ID
   */
  getBundle(bundleId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/bundles/${bundleId}`);
  }

  /**
   * Get Reference by ID
   */
  getReference(referenceId: string): Observable<Reference> {
    return this.http.get<Reference>(`${this.apiUrl}/references/${referenceId}`);
  }

  /**
   * Request Reach-Back
   * Send additional questions to referrer
   */
  requestReachBack(request: ReachBackRequest): Observable<ReachBackResponse> {
    return this.http.post<ReachBackResponse>(
      `${this.apiUrl}/employer/reach-back`,
      request
    );
  }

  /**
   * Get Media Stream URL
   * Returns authenticated streaming URL for media content
   */
  getMediaStreamUrl(referenceId: string, mediaId: string): Observable<string> {
    return this.http
      .get<{ streamUrl: string }>(
        `${this.apiUrl}/references/${referenceId}/media/${mediaId}/stream`
      )
      .pipe(map((response) => response.streamUrl));
  }

  /**
   * Get Media Download URL
   * Returns authenticated download URL
   */
  getMediaDownloadUrl(referenceId: string, mediaId: string): Observable<string> {
    return this.http
      .get<{ downloadUrl: string }>(
        `${this.apiUrl}/references/${referenceId}/media/${mediaId}/download`
      )
      .pipe(map((response) => response.downloadUrl));
  }

  /**
   * Export Bundle
   * Generates exportable bundle in specified format
   */
  exportBundle(bundleId: string, format: string): Observable<string> {
    const params = new HttpParams().set('format', format);
    return this.http
      .get<{ downloadUrl: string }>(`${this.apiUrl}/bundles/${bundleId}/export`, {
        params,
      })
      .pipe(map((response) => response.downloadUrl));
  }

  /**
   * Export Reference
   * Generates exportable reference in specified format
   */
  exportReference(referenceId: string, format: string): Observable<string> {
    const params = new HttpParams().set('format', format);
    return this.http
      .get<{ downloadUrl: string }>(`${this.apiUrl}/references/${referenceId}/export`, {
        params,
      })
      .pipe(map((response) => response.downloadUrl));
  }

  /**
   * Get Reference Transcription
   * For video/audio references
   */
  getTranscription(referenceId: string): Observable<string> {
    return this.http
      .get<{ transcription: string }>(
        `${this.apiUrl}/references/${referenceId}/transcription`
      )
      .pipe(map((response) => response.transcription));
  }

  /**
   * Get Captions URL
   * For video references
   */
  getCaptionsUrl(referenceId: string): Observable<string> {
    return this.http
      .get<{ captionsUrl: string }>(
        `${this.apiUrl}/references/${referenceId}/captions`
      )
      .pipe(map((response) => response.captionsUrl));
  }

  /**
   * Get Audio Waveform Data
   * For audio visualization
   */
  getWaveformData(referenceId: string): Observable<number[]> {
    return this.http
      .get<{ waveform: number[] }>(
        `${this.apiUrl}/references/${referenceId}/waveform`
      )
      .pipe(map((response) => response.waveform));
  }
}
