/**
 * Analytics Service
 *
 * Handles client-side analytics tracking for bundle viewing.
 * Tracks events without exposing PII and sends to backend.
 * Implements batching and offline queue for reliability.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { AnalyticsEvent, AnalyticsEventType } from '../models/employer.models';

/**
 * Storage key for offline event queue
 */
const STORAGE_KEY = 'deepref_analytics_queue';

/**
 * Maximum events to store offline
 */
const MAX_QUEUE_SIZE = 100;

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/analytics';
  private offlineQueue: AnalyticsEvent[] = [];

  constructor() {
    this.loadOfflineQueue();
    this.setupBeforeUnloadHandler();
  }

  /**
   * Track Single Event
   */
  trackEvent(event: AnalyticsEvent): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/events`, event)
      .pipe(
        retry(2),
        catchError((error) => {
          console.warn('Analytics event failed, queuing for retry:', error);
          this.queueEvent(event);
          return of(undefined);
        })
      );
  }

  /**
   * Track Multiple Events in Batch
   */
  trackEvents(events: AnalyticsEvent[]): Observable<void> {
    if (events.length === 0) {
      return of(undefined);
    }

    return this.http
      .post<void>(`${this.apiUrl}/events/batch`, { events })
      .pipe(
        retry(2),
        catchError((error) => {
          console.warn('Batch analytics failed, queuing for retry:', error);
          events.forEach((event) => this.queueEvent(event));
          return of(undefined);
        })
      );
  }

  /**
   * Track Bundle View
   */
  trackBundleView(bundleId: string, sessionId: string): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.BUNDLE_VIEW,
      bundleId,
      sessionId,
      timestamp: Date.now(),
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Track Bundle Access
   */
  trackBundleAccess(
    bundleId: string,
    sessionId: string,
    accessType: string
  ): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.BUNDLE_ACCESS,
      bundleId,
      sessionId,
      timestamp: Date.now(),
      metadata: { accessType },
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Track Reference View
   */
  trackReferenceView(
    bundleId: string,
    referenceId: string,
    sessionId: string
  ): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.REFERENCE_VIEW,
      bundleId,
      referenceId,
      sessionId,
      timestamp: Date.now(),
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Track Reference Play
   */
  trackReferencePlay(
    bundleId: string,
    referenceId: string,
    sessionId: string,
    playbackPosition: number
  ): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.REFERENCE_PLAY,
      bundleId,
      referenceId,
      sessionId,
      timestamp: Date.now(),
      metadata: { playbackPosition },
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Track Reference Download
   */
  trackReferenceDownload(
    bundleId: string,
    referenceId: string,
    sessionId: string,
    downloadFormat: string
  ): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.REFERENCE_DOWNLOAD,
      bundleId,
      referenceId,
      sessionId,
      timestamp: Date.now(),
      metadata: { downloadFormat },
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Track Time Spent
   */
  trackTimeSpent(
    bundleId: string,
    sessionId: string,
    duration: number
  ): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.TIME_SPENT,
      bundleId,
      sessionId,
      timestamp: Date.now(),
      metadata: { duration },
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Track Reach-Back Request
   */
  trackReachBackRequest(
    bundleId: string,
    referenceId: string,
    sessionId: string
  ): void {
    const event: AnalyticsEvent = {
      eventType: AnalyticsEventType.REACH_BACK_REQUEST,
      bundleId,
      referenceId,
      sessionId,
      timestamp: Date.now(),
    };

    this.trackEvent(event).subscribe();
  }

  /**
   * Queue Event for Offline Retry
   */
  private queueEvent(event: AnalyticsEvent): void {
    this.offlineQueue.push(event);

    // Limit queue size
    if (this.offlineQueue.length > MAX_QUEUE_SIZE) {
      this.offlineQueue = this.offlineQueue.slice(-MAX_QUEUE_SIZE);
    }

    this.saveOfflineQueue();
  }

  /**
   * Process Offline Queue
   * Attempts to send queued events
   */
  processOfflineQueue(): Observable<void> {
    if (this.offlineQueue.length === 0) {
      return of(undefined);
    }

    const events = [...this.offlineQueue];
    return this.trackEvents(events).pipe(
      tap(() => {
        // Clear queue on success
        this.offlineQueue = [];
        this.saveOfflineQueue();
      }),
      catchError((error) => {
        console.error('Failed to process offline queue:', error);
        return of(undefined);
      })
    );
  }

  /**
   * Save Offline Queue to Storage
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Error saving analytics queue:', error);
    }
  }

  /**
   * Load Offline Queue from Storage
   */
  private loadOfflineQueue(): void {
    try {
      const queueStr = localStorage.getItem(STORAGE_KEY);
      if (queueStr) {
        this.offlineQueue = JSON.parse(queueStr);
        // Process queue on load
        this.processOfflineQueue().subscribe();
      }
    } catch (error) {
      console.error('Error loading analytics queue:', error);
      this.offlineQueue = [];
    }
  }

  /**
   * Clear Offline Queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Setup Before Unload Handler
   * Ensures pending events are sent before page close
   */
  private setupBeforeUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // Use sendBeacon API for reliable sending on page close
        if (this.offlineQueue.length > 0) {
          this.sendBeacon(this.offlineQueue);
        }
      });
    }
  }

  /**
   * Send Events using Beacon API
   * For reliable delivery on page close
   */
  private sendBeacon(events: AnalyticsEvent[]): void {
    if (!navigator.sendBeacon) {
      return;
    }

    try {
      const blob = new Blob([JSON.stringify({ events })], {
        type: 'application/json',
      });
      navigator.sendBeacon(`${this.apiUrl}/events/batch`, blob);
      this.clearOfflineQueue();
    } catch (error) {
      console.error('Error sending beacon:', error);
    }
  }

  /**
   * Get Offline Queue Size
   */
  getQueueSize(): number {
    return this.offlineQueue.length;
  }

  /**
   * Check if Queue is Empty
   */
  isQueueEmpty(): boolean {
    return this.offlineQueue.length === 0;
  }
}
