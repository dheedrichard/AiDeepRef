/**
 * Referrer API Service
 *
 * Handles all API calls related to the referrer feature.
 * Integrates with DeepRef backend API endpoints.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ReferenceRequest,
  CompletedReference,
  ReferrerStats,
  ReferrerNotification,
  SubmitReferenceResponsePayload,
  SubmitReferenceResponseResponse,
  SaveDraftPayload,
  ReferenceResponse,
} from '../../../features/referrer/models/referrer.models';

@Injectable({
  providedIn: 'root',
})
export class ReferrerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  /**
   * Get all reference requests for the current referrer
   */
  getRequests(): Observable<ReferenceRequest[]> {
    return this.http.get<any[]>(`${this.baseUrl}/referrer/requests`).pipe(
      map((data) =>
        data.map((item) => ({
          ...item,
          requestedAt: new Date(item.requestedAt),
          expiresAt: new Date(item.expiresAt),
          respondedAt: item.respondedAt ? new Date(item.respondedAt) : undefined,
        }))
      )
    );
  }

  /**
   * Get a single reference request by ID
   */
  getRequest(requestId: string): Observable<ReferenceRequest> {
    return this.http.get<any>(`${this.baseUrl}/references/${requestId}`).pipe(
      map((data) => ({
        ...data,
        requestedAt: new Date(data.requestedAt),
        expiresAt: new Date(data.expiresAt),
        respondedAt: data.respondedAt ? new Date(data.respondedAt) : undefined,
      }))
    );
  }

  /**
   * Accept a reference request
   */
  acceptRequest(requestId: string): Observable<ReferenceRequest> {
    return this.http
      .post<any>(`${this.baseUrl}/references/${requestId}/accept`, {})
      .pipe(
        map((data) => ({
          ...data,
          requestedAt: new Date(data.requestedAt),
          expiresAt: new Date(data.expiresAt),
          respondedAt: data.respondedAt ? new Date(data.respondedAt) : undefined,
        }))
      );
  }

  /**
   * Decline a reference request
   */
  declineRequest(requestId: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/references/${requestId}/decline`, {
      reason,
    });
  }

  /**
   * Submit a reference response
   */
  submitResponse(
    payload: SubmitReferenceResponsePayload
  ): Observable<SubmitReferenceResponseResponse> {
    return this.http.post<SubmitReferenceResponseResponse>(
      `${this.baseUrl}/references/${payload.referenceRequestId}/submit`,
      {
        format: payload.format,
        responses: payload.responses,
        attachments: payload.attachments,
      }
    );
  }

  /**
   * Save a draft response
   */
  saveDraft(payload: SaveDraftPayload): Observable<ReferenceResponse> {
    return this.http
      .post<any>(`${this.baseUrl}/references/${payload.referenceRequestId}/draft`, {
        format: payload.format,
        responses: payload.responses,
        attachments: payload.attachments,
      })
      .pipe(
        map((data) => ({
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
        }))
      );
  }

  /**
   * Get a draft response for a reference request
   */
  getDraft(referenceRequestId: string): Observable<ReferenceResponse | null> {
    return this.http
      .get<any>(`${this.baseUrl}/references/${referenceRequestId}/draft`)
      .pipe(
        map((data) =>
          data
            ? {
                ...data,
                createdAt: new Date(data.createdAt),
                updatedAt: new Date(data.updatedAt),
                submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
              }
            : null
        )
      );
  }

  /**
   * Get completed references
   */
  getCompletedReferences(): Observable<CompletedReference[]> {
    return this.http.get<any[]>(`${this.baseUrl}/referrer/completed`).pipe(
      map((data) =>
        data.map((item) => ({
          ...item,
          submittedAt: new Date(item.submittedAt),
        }))
      )
    );
  }

  /**
   * Get referrer statistics
   */
  getStatistics(): Observable<ReferrerStats> {
    return this.http.get<ReferrerStats>(`${this.baseUrl}/referrer/stats`);
  }

  /**
   * Get notifications
   */
  getNotifications(): Observable<ReferrerNotification[]> {
    return this.http.get<any[]>(`${this.baseUrl}/referrer/notifications`).pipe(
      map((data) =>
        data.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }))
      )
    );
  }

  /**
   * Mark a notification as read
   */
  markNotificationRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/referrer/notifications/${notificationId}/read`,
      {}
    );
  }
}
