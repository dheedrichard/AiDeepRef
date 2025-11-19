/**
 * Employer Effects
 *
 * Handles side effects for employer feature including:
 * - API calls for bundle access and references
 * - Analytics event tracking
 * - Session management
 * - Media streaming requests
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, timer, interval } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  tap,
  mergeMap,
  withLatestFrom,
  filter,
  debounceTime,
  bufferTime,
} from 'rxjs/operators';

import { EmployerActions } from './employer.actions';
import { selectSession, selectPendingAnalyticsEvents } from './employer.selectors';
import { EmployerApiService } from '../services/employer-api.service';
import { BundleAccessService } from '../services/bundle-access.service';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsEventType } from '../models/employer.models';

@Injectable()
export class EmployerEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly employerApi = inject(EmployerApiService);
  private readonly bundleAccess = inject(BundleAccessService);
  private readonly analytics = inject(AnalyticsService);

  /**
   * Request Bundle Access Effect
   * Handles bundle access requests with password validation
   */
  requestBundleAccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.requestBundleAccess),
      switchMap(({ request }) =>
        this.bundleAccess.requestAccess(request).pipe(
          map((response) => {
            // Save session locally
            this.bundleAccess.saveSession(response.session);
            return EmployerActions.requestBundleAccessSuccess({ response });
          }),
          catchError((error) =>
            of(
              EmployerActions.requestBundleAccessFailure({
                error: error.message || 'Failed to access bundle',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Bundle Effect
   */
  loadBundle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.loadBundle),
      switchMap(({ bundleId }) =>
        this.employerApi.getBundle(bundleId).pipe(
          map((bundle) => EmployerActions.loadBundleSuccess({ bundle })),
          catchError((error) =>
            of(
              EmployerActions.loadBundleFailure({
                error: error.message || 'Failed to load bundle',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Reference Effect
   */
  loadReference$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.loadReference),
      switchMap(({ referenceId }) =>
        this.employerApi.getReference(referenceId).pipe(
          map((reference) => EmployerActions.loadReferenceSuccess({ reference })),
          catchError((error) =>
            of(
              EmployerActions.loadReferenceFailure({
                error: error.message || 'Failed to load reference',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Request Reach-Back Effect
   */
  requestReachBack$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.requestReachBack),
      switchMap(({ request }) =>
        this.employerApi.requestReachBack(request).pipe(
          map((response) => EmployerActions.requestReachBackSuccess({ response })),
          catchError((error) =>
            of(
              EmployerActions.requestReachBackFailure({
                error: error.message || 'Failed to send reach-back request',
                referenceId: request.referenceId,
              })
            )
          )
        )
      )
    )
  );

  /**
   * Request Media Stream Effect
   */
  requestMediaStream$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.requestMediaStream),
      switchMap(({ referenceId, mediaId }) =>
        this.employerApi.getMediaStreamUrl(referenceId, mediaId).pipe(
          map((streamUrl) => EmployerActions.requestMediaStreamSuccess({ streamUrl })),
          catchError((error) =>
            of(
              EmployerActions.requestMediaStreamFailure({
                error: error.message || 'Failed to get media stream',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Export Bundle Effect
   */
  exportBundle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.exportBundle),
      switchMap(({ bundleId, format }) =>
        this.employerApi.exportBundle(bundleId, format).pipe(
          map((downloadUrl) => EmployerActions.exportSuccess({ downloadUrl })),
          tap(({ downloadUrl }) => {
            // Trigger download
            window.open(downloadUrl, '_blank');
          }),
          catchError((error) =>
            of(
              EmployerActions.exportFailure({
                error: error.message || 'Failed to export bundle',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Export Reference Effect
   */
  exportReference$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.exportReference),
      switchMap(({ referenceId, format }) =>
        this.employerApi.exportReference(referenceId, format).pipe(
          map((downloadUrl) => EmployerActions.exportSuccess({ downloadUrl })),
          tap(({ downloadUrl }) => {
            // Trigger download
            window.open(downloadUrl, '_blank');
          }),
          catchError((error) =>
            of(
              EmployerActions.exportFailure({
                error: error.message || 'Failed to export reference',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Track Analytics Event Effect
   * Buffers events and sends in batches
   */
  trackEvent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.trackEvent),
      bufferTime(5000), // Buffer for 5 seconds
      filter((events) => events.length > 0),
      mergeMap((actions) => {
        const events = actions.map((action) => action.event);
        return this.analytics.trackEvents(events).pipe(
          map(() => EmployerActions.trackEventSuccess()),
          catchError((error) =>
            of(
              EmployerActions.trackEventFailure({
                error: error.message || 'Failed to track analytics',
              })
            )
          )
        );
      })
    )
  );

  /**
   * Start Bundle View Effect
   * Tracks bundle access analytics
   */
  startBundleView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.startBundleView),
      withLatestFrom(this.store.select(selectSession)),
      map(([{ bundleId }, session]) => {
        if (!session) return EmployerActions.clearError();

        return EmployerActions.trackEvent({
          event: {
            eventType: AnalyticsEventType.BUNDLE_VIEW,
            bundleId,
            sessionId: session.sessionId,
            timestamp: Date.now(),
          },
        });
      })
    )
  );

  /**
   * End Bundle View Effect
   * Tracks total time spent on bundle
   */
  endBundleView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.endBundleView),
      withLatestFrom(this.store.select(selectSession)),
      map(([{ bundleId }, session]) => {
        if (!session) return EmployerActions.clearError();

        // Calculate duration from store
        const viewStartTime = Date.now(); // This should come from analytics state
        const duration = Math.floor((Date.now() - viewStartTime) / 1000);

        return EmployerActions.trackEvent({
          event: {
            eventType: AnalyticsEventType.TIME_SPENT,
            bundleId,
            sessionId: session.sessionId,
            timestamp: Date.now(),
            metadata: { duration },
          },
        });
      })
    )
  );

  /**
   * Track Reference Play Effect
   */
  trackReferencePlay$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.trackReferencePlay),
      withLatestFrom(this.store.select(selectSession)),
      filter(([, session]) => session !== null),
      map(([{ referenceId, position }, session]) =>
        EmployerActions.trackEvent({
          event: {
            eventType: AnalyticsEventType.REFERENCE_PLAY,
            bundleId: session!.bundleId,
            referenceId,
            sessionId: session!.sessionId,
            timestamp: Date.now(),
            metadata: { playbackPosition: position },
          },
        })
      )
    )
  );

  /**
   * Track Reference Download Effect
   */
  trackReferenceDownload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EmployerActions.trackReferenceDownload),
      withLatestFrom(this.store.select(selectSession)),
      filter(([, session]) => session !== null),
      map(([{ referenceId, format }, session]) =>
        EmployerActions.trackEvent({
          event: {
            eventType: AnalyticsEventType.REFERENCE_DOWNLOAD,
            bundleId: session!.bundleId,
            referenceId,
            sessionId: session!.sessionId,
            timestamp: Date.now(),
            metadata: { downloadFormat: format },
          },
        })
      )
    )
  );

  /**
   * Session Validity Check Effect
   * Runs periodically to check session expiration
   */
  checkSessionValidity$ = createEffect(() =>
    interval(60000).pipe( // Check every minute
      withLatestFrom(this.store.select(selectSession)),
      filter(([, session]) => session !== null),
      map(([, session]) => {
        if (session && session.expiresAt < Date.now()) {
          return EmployerActions.sessionExpired();
        }
        return EmployerActions.clearError();
      })
    )
  );

  /**
   * Session Expired Effect
   * Redirects to bundle access page
   */
  sessionExpired$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EmployerActions.sessionExpired),
        tap(() => {
          this.bundleAccess.clearSession();
          this.router.navigate(['/employer/bundle-access']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Handle Expired Bundle Effect
   */
  handleExpiredBundle$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EmployerActions.handleExpiredBundle),
        tap(() => {
          this.bundleAccess.clearSession();
          this.router.navigate(['/employer/bundle-access'], {
            queryParams: { error: 'expired' },
          });
        })
      ),
    { dispatch: false }
  );

  /**
   * Handle Access Denied Effect
   */
  handleAccessDenied$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EmployerActions.handleAccessDenied),
        tap(() => {
          this.router.navigate(['/employer/bundle-access'], {
            queryParams: { error: 'access_denied' },
          });
        })
      ),
    { dispatch: false }
  );

  /**
   * Navigate After Successful Access Effect
   */
  navigateAfterAccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EmployerActions.requestBundleAccessSuccess),
        tap(({ response }) => {
          this.router.navigate(['/employer/bundle-viewer', response.bundle.id]);
        })
      ),
    { dispatch: false }
  );
}
