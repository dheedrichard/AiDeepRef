/**
 * Seeker Effects
 *
 * Handles side effects for the seeker feature module.
 * Manages API calls, navigation, and other async operations.
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import {
  DashboardActions,
  ReferenceRequestActions,
  ReferenceActions,
  BundleActions,
} from './seeker.actions';
import { SeekerApiService } from '../services/seeker-api.service';
import { ReferenceApiService } from '../services/reference-api.service';
import { BundleApiService } from '../services/bundle-api.service';
import { AiApiService } from '../services/ai-api.service';

/**
 * Seeker Effects
 */
@Injectable()
export class SeekerEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private router = inject(Router);
  private seekerApi = inject(SeekerApiService);
  private referenceApi = inject(ReferenceApiService);
  private bundleApi = inject(BundleApiService);
  private aiApi = inject(AiApiService);

  /**
   * Load Dashboard Effect
   */
  loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadDashboard),
      switchMap(() =>
        this.seekerApi.getDashboardData().pipe(
          map(({ stats, recentActivity }) =>
            DashboardActions.loadDashboardSuccess({ stats, recentActivity })
          ),
          catchError((error) =>
            of(DashboardActions.loadDashboardFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Refresh Activity Effect
   */
  refreshActivity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.refreshActivity),
      switchMap(() =>
        this.seekerApi.getRecentActivity().pipe(
          map((recentActivity) =>
            DashboardActions.refreshActivitySuccess({ recentActivity })
          ),
          catchError((error) =>
            of(DashboardActions.refreshActivityFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load Requests Effect
   */
  loadRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceRequestActions.loadRequests),
      switchMap(() =>
        this.referenceApi.getRequests().pipe(
          map((requests) => ReferenceRequestActions.loadRequestsSuccess({ requests })),
          catchError((error) =>
            of(ReferenceRequestActions.loadRequestsFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load Request Effect
   */
  loadRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceRequestActions.loadRequest),
      switchMap(({ requestId }) =>
        this.referenceApi.getRequest(requestId).pipe(
          map((request) => ReferenceRequestActions.loadRequestSuccess({ request })),
          catchError((error) =>
            of(ReferenceRequestActions.loadRequestFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Create Request Effect
   */
  createRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceRequestActions.createRequest),
      switchMap(({ payload }) =>
        this.referenceApi.createRequest(payload).pipe(
          map((request) => ReferenceRequestActions.createRequestSuccess({ request })),
          catchError((error) =>
            of(ReferenceRequestActions.createRequestFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Navigate after Create Request Success
   */
  createRequestSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ReferenceRequestActions.createRequestSuccess),
        tap(() => {
          this.router.navigate(['/app/seeker/requests']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Delete Request Effect
   */
  deleteRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceRequestActions.deleteRequest),
      switchMap(({ requestId }) =>
        this.referenceApi.deleteRequest(requestId).pipe(
          map(() => ReferenceRequestActions.deleteRequestSuccess({ requestId })),
          catchError((error) =>
            of(ReferenceRequestActions.deleteRequestFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Generate Questions Effect
   */
  generateQuestions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceRequestActions.generateQuestions),
      switchMap(({ request }) =>
        this.aiApi.generateQuestions(request).pipe(
          map((response) => ReferenceRequestActions.generateQuestionsSuccess({ response })),
          catchError((error) =>
            of(ReferenceRequestActions.generateQuestionsFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load References Effect
   */
  loadReferences$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceActions.loadReferences),
      switchMap(({ filters }) =>
        this.referenceApi.getReferences(filters).pipe(
          map((references) => ReferenceActions.loadReferencesSuccess({ references })),
          catchError((error) =>
            of(ReferenceActions.loadReferencesFailure({ error: error.message }))
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
      ofType(ReferenceActions.loadReference),
      switchMap(({ referenceId }) =>
        this.referenceApi.getReference(referenceId).pipe(
          map((reference) => ReferenceActions.loadReferenceSuccess({ reference })),
          catchError((error) =>
            of(ReferenceActions.loadReferenceFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Download Reference Effect
   */
  downloadReference$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReferenceActions.downloadReference),
      switchMap(({ referenceId }) =>
        this.referenceApi.downloadReference(referenceId).pipe(
          map(() => ReferenceActions.downloadReferenceSuccess({ referenceId })),
          catchError((error) =>
            of(ReferenceActions.downloadReferenceFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Load Bundles Effect
   */
  loadBundles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BundleActions.loadBundles),
      switchMap(() =>
        this.bundleApi.getBundles().pipe(
          map((bundles) => BundleActions.loadBundlesSuccess({ bundles })),
          catchError((error) =>
            of(BundleActions.loadBundlesFailure({ error: error.message }))
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
      ofType(BundleActions.loadBundle),
      switchMap(({ bundleId }) =>
        this.bundleApi.getBundle(bundleId).pipe(
          map((bundle) => BundleActions.loadBundleSuccess({ bundle })),
          catchError((error) =>
            of(BundleActions.loadBundleFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Create Bundle Effect
   */
  createBundle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BundleActions.createBundle),
      switchMap(({ payload }) =>
        this.bundleApi.createBundle(payload).pipe(
          map((bundle) => BundleActions.createBundleSuccess({ bundle })),
          catchError((error) =>
            of(BundleActions.createBundleFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Navigate after Create Bundle Success
   */
  createBundleSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BundleActions.createBundleSuccess),
        tap(({ bundle }) => {
          this.router.navigate(['/app/seeker/bundles', bundle.id]);
        })
      ),
    { dispatch: false }
  );

  /**
   * Update Bundle Effect
   */
  updateBundle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BundleActions.updateBundle),
      switchMap(({ bundleId, payload }) =>
        this.bundleApi.updateBundle(bundleId, payload).pipe(
          map((bundle) => BundleActions.updateBundleSuccess({ bundle })),
          catchError((error) =>
            of(BundleActions.updateBundleFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Delete Bundle Effect
   */
  deleteBundle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BundleActions.deleteBundle),
      switchMap(({ bundleId }) =>
        this.bundleApi.deleteBundle(bundleId).pipe(
          map(() => BundleActions.deleteBundleSuccess({ bundleId })),
          catchError((error) =>
            of(BundleActions.deleteBundleFailure({ error: error.message }))
          )
        )
      )
    )
  );

  /**
   * Navigate after Delete Bundle Success
   */
  deleteBundleSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BundleActions.deleteBundleSuccess),
        tap(() => {
          this.router.navigate(['/app/seeker/bundles']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Load Bundle Analytics Effect
   */
  loadBundleAnalytics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BundleActions.loadBundleAnalytics),
      switchMap(({ bundleId }) =>
        this.bundleApi.getBundleAnalytics(bundleId).pipe(
          map((analytics) => BundleActions.loadBundleAnalyticsSuccess({ analytics })),
          catchError((error) =>
            of(BundleActions.loadBundleAnalyticsFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
