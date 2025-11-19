/**
 * AI API Service
 *
 * Handles all AI-related API calls.
 * Provides methods for question generation and media verification.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
} from '../models/seeker.models';
import { environment } from '../../../../environments/environment';

/**
 * AI API Service
 */
@Injectable({
  providedIn: 'root',
})
export class AiApiService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ai`;

  /**
   * Generate Questions Using AI
   */
  generateQuestions(
    request: GenerateQuestionsRequest
  ): Observable<GenerateQuestionsResponse> {
    return this.http.post<GenerateQuestionsResponse>(
      `${this.apiUrl}/generate-questions`,
      request
    );
  }

  /**
   * Verify Media Authenticity
   */
  verifyAuthenticity(
    mediaUrl: string,
    mediaType: 'video' | 'audio'
  ): Observable<{
    authenticityScore: number;
    deepfakeProbability: number;
  }> {
    return this.http.post<{
      authenticityScore: number;
      deepfakeProbability: number;
    }>(`${this.apiUrl}/verify-authenticity`, {
      mediaUrl,
      mediaType,
    });
  }
}
