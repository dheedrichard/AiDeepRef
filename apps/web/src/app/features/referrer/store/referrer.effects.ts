/**
 * Referrer Effects
 *
 * NgRx effects for handling side effects in the referrer feature.
 * Manages API calls, notifications, and async operations.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ReferrerActions } from './referrer.actions';
import { ReferrerApiService } from '../../../core/services/api/referrer-api.service';
import { MediaUploadService } from '../../../core/services/api/media-upload.service';

@Injectable()
export class ReferrerEffects {
  private readonly actions$ = inject(Actions);
  private readonly referrerApi = inject(ReferrerApiService);
  private readonly mediaUpload = inject(MediaUploadService);
  private readonly router = inject(Router);

  /**
   * Load Requests Effect
   */
  loadRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.loadRequests),
      switchMap(() =>
        this.referrerApi.getRequests().pipe(
          map((requests) => ReferrerActions.loadRequestsSuccess({ requests })),
          catchError((error) =>
            of(ReferrerActions.loadRequestsFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load Single Request Effect
   */
  loadRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.loadRequest),
      switchMap(({ requestId }) =>
        this.referrerApi.getRequest(requestId).pipe(
          map((request) => ReferrerActions.loadRequestSuccess({ request })),
          catchError((error) =>
            of(ReferrerActions.loadRequestFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Accept Request Effect
   */
  acceptRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.acceptRequest),
      switchMap(({ requestId }) =>
        this.referrerApi.acceptRequest(requestId).pipe(
          map((request) => ReferrerActions.acceptRequestSuccess({ request })),
          catchError((error) =>
            of(ReferrerActions.acceptRequestFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Decline Request Effect
   */
  declineRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.declineRequest),
      switchMap(({ requestId, reason }) =>
        this.referrerApi.declineRequest(requestId, reason).pipe(
          map(() => ReferrerActions.declineRequestSuccess({ requestId })),
          catchError((error) =>
            of(ReferrerActions.declineRequestFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Decline Request Success - Navigate to Dashboard
   */
  declineRequestSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ReferrerActions.declineRequestSuccess),
        tap(() => {
          this.router.navigate(['/referrer/dashboard']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Submit Response Effect
   */
  submitResponse$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.submitResponse),
      switchMap(({ payload }) =>
        this.referrerApi.submitResponse(payload).pipe(
          map((response) => ReferrerActions.submitResponseSuccess({ response })),
          catchError((error) =>
            of(ReferrerActions.submitResponseFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Submit Response Success - Navigate to Dashboard
   */
  submitResponseSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ReferrerActions.submitResponseSuccess),
        tap(() => {
          this.router.navigate(['/referrer/dashboard']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Save Draft Effect
   */
  saveDraft$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.saveDraft),
      switchMap(({ payload }) =>
        this.referrerApi.saveDraft(payload).pipe(
          map((draft) => ReferrerActions.saveDraftSuccess({ draft })),
          catchError((error) => of(ReferrerActions.saveDraftFailure({ error: error.message })))
        )
      )
    )
  );

  /**
   * Load Draft Effect
   */
  loadDraft$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.loadDraft),
      switchMap(({ referenceRequestId }) =>
        this.referrerApi.getDraft(referenceRequestId).pipe(
          map((draft) => ReferrerActions.loadDraftSuccess({ draft })),
          catchError((error) => of(ReferrerActions.loadDraftFailure({ error: error.message })))
        )
      )
    )
  );

  /**
   * Upload Media Effect
   */
  uploadMedia$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.uploadMedia),
      switchMap(({ payload }) =>
        this.mediaUpload.uploadMedia(payload).pipe(
          map((response) => ReferrerActions.uploadMediaSuccess({ response })),
          catchError((error) =>
            of(
              ReferrerActions.uploadMediaFailure({
                fileId: payload.file.name,
                error: error.message,
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Completed References Effect
   */
  loadCompletedReferences$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.loadCompletedReferences),
      switchMap(() =>
        this.referrerApi.getCompletedReferences().pipe(
          map((references) =>
            ReferrerActions.loadCompletedReferencesSuccess({ references })
          ),
          catchError((error) =>
            of(ReferrerActions.loadCompletedReferencesFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load Statistics Effect
   */
  loadStatistics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.loadStatistics),
      switchMap(() =>
        this.referrerApi.getStatistics().pipe(
          map((stats) => ReferrerActions.loadStatisticsSuccess({ stats })),
          catchError((error) =>
            of(ReferrerActions.loadStatisticsFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load Notifications Effect
   */
  loadNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.loadNotifications),
      switchMap(() =>
        this.referrerApi.getNotifications().pipe(
          map((notifications) =>
            ReferrerActions.loadNotificationsSuccess({ notifications })
          ),
          catchError((error) =>
            of(ReferrerActions.loadNotificationsFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Mark Notification as Read Effect
   */
  markNotificationRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferrerActions.markNotificationRead),
      switchMap(({ notificationId }) =>
        this.referrerApi.markNotificationRead(notificationId).pipe(
          map(() => ReferrerActions.markNotificationReadSuccess({ notificationId })),
          catchError((error) =>
            of(ReferrerActions.markNotificationReadFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
