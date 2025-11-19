/**
 * Auth Effects
 *
 * Handles side effects for authentication actions.
 * Manages API calls, routing, and local storage operations.
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, exhaustMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthActions } from './auth.actions';
import { UserRole } from '../models/auth.models';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Sign Up Effect
   * Handles user registration and automatic login
   */
  signUp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signUp),
      exhaustMap(({ request }) =>
        this.authService.signUp(request).pipe(
          map((response) => AuthActions.signUpSuccess({ response })),
          catchError((error) =>
            of(AuthActions.signUpFailure({ error: error.message || 'Sign up failed' }))
          )
        )
      )
    )
  );

  /**
   * Sign Up Success Effect
   * Saves user to storage and redirects based on role
   */
  signUpSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signUpSuccess),
        tap(({ response }) => {
          // Save to storage
          this.authService.saveToStorage(
            response.user,
            response.token,
            true // Always keep signed in after signup
          );

          // Redirect based on role and KYC status
          if (response.user.role === UserRole.SEEKER) {
            // Seekers need to complete KYC
            this.router.navigate(['/auth/id-capture']);
          } else {
            // Other roles go to their dashboards
            this.redirectToDashboard(response.user.role);
          }
        })
      ),
    { dispatch: false }
  );

  /**
   * Sign In Effect
   * Sends magic link to user's email
   */
  signIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signIn),
      exhaustMap(({ request }) =>
        this.authService.signIn(request).pipe(
          map((response) => AuthActions.signInSuccess({ response })),
          catchError((error) =>
            of(AuthActions.signInFailure({ error: error.message || 'Sign in failed' }))
          )
        )
      )
    )
  );

  /**
   * Sign In Success Effect
   * Redirects to verify email page
   */
  signInSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInSuccess),
        tap(() => {
          this.router.navigate(['/auth/verify-email']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Resend Magic Link Effect
   */
  resendMagicLink$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.resendMagicLink),
      exhaustMap(({ email }) =>
        this.authService.resendMagicLink(email).pipe(
          map(() => AuthActions.resendMagicLinkSuccess()),
          catchError((error) =>
            of(
              AuthActions.resendMagicLinkFailure({
                error: error.message || 'Failed to resend magic link',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Verify Email Effect
   * Verifies email token and logs user in
   */
  verifyEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyEmail),
      exhaustMap(({ request }) =>
        this.authService.verifyEmail(request).pipe(
          map((response) => AuthActions.verifyEmailSuccess({ response })),
          catchError((error) =>
            of(AuthActions.verifyEmailFailure({ error: error.message || 'Verification failed' }))
          )
        )
      )
    )
  );

  /**
   * Verify Email Success Effect
   * Saves user and redirects based on role
   */
  verifyEmailSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.verifyEmailSuccess),
        tap(({ response }) => {
          // Save to storage
          this.authService.saveToStorage(response.user, response.token, true);

          // Redirect based on role and KYC status
          if (response.user.role === UserRole.SEEKER && !response.user.emailVerified) {
            this.router.navigate(['/auth/id-capture']);
          } else {
            this.redirectToDashboard(response.user.role);
          }
        })
      ),
    { dispatch: false }
  );

  /**
   * Logout Effect
   * Clears storage and redirects to welcome page
   */
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        this.authService.clearStorage();
      }),
      map(() => AuthActions.logoutSuccess())
    )
  );

  /**
   * Logout Success Effect
   * Redirects to welcome page
   */
  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess),
        tap(() => {
          this.router.navigate(['/auth/welcome']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Load User from Storage Effect
   * Loads user on app init
   */
  loadUserFromStorage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadUserFromStorage),
      map(() => {
        const stored = this.authService.loadFromStorage();
        if (stored) {
          return AuthActions.loadUserFromStorageSuccess({
            user: stored.user,
            token: stored.token,
          });
        }
        return AuthActions.loadUserFromStorageFailure();
      })
    )
  );

  /**
   * Upload KYC Documents Effect
   */
  uploadKycDocuments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.uploadKycDocuments),
      exhaustMap(({ request }) =>
        this.authService.uploadKycDocuments(request).pipe(
          map((response) => AuthActions.uploadKycDocumentsSuccess({ response })),
          catchError((error) =>
            of(
              AuthActions.uploadKycDocumentsFailure({
                error: error.message || 'Document upload failed',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Upload KYC Documents Success Effect
   * Redirects to selfie capture
   */
  uploadKycDocumentsSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.uploadKycDocumentsSuccess),
        tap(() => {
          this.router.navigate(['/auth/selfie-capture']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Upload KYC Selfie Effect
   */
  uploadKycSelfie$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.uploadKycSelfie),
      exhaustMap(({ request }) =>
        this.authService.uploadKycSelfie(request).pipe(
          map((response) => AuthActions.uploadKycSelfieSuccess({ response })),
          catchError((error) =>
            of(
              AuthActions.uploadKycSelfieFailure({
                error: error.message || 'Selfie upload failed',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Upload KYC Selfie Success Effect
   * Redirects to verification result
   */
  uploadKycSelfieSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.uploadKycSelfieSuccess),
        tap(() => {
          this.router.navigate(['/auth/verification-result']);
        })
      ),
    { dispatch: false }
  );

  /**
   * Check KYC Status Effect
   */
  checkKycStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkKycStatus),
      exhaustMap(({ userId }) =>
        this.authService.checkKycStatus(userId).pipe(
          map((result) => AuthActions.checkKycStatusSuccess({ result })),
          catchError((error) =>
            of(
              AuthActions.checkKycStatusFailure({
                error: error.message || 'Failed to check KYC status',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Helper method to redirect to appropriate dashboard based on role
   */
  private redirectToDashboard(role: UserRole): void {
    switch (role) {
      case UserRole.SEEKER:
        this.router.navigate(['/app/seeker/dashboard']);
        break;
      case UserRole.REFERRER:
        this.router.navigate(['/r/app/submissions']);
        break;
      case UserRole.EMPLOYER:
        this.router.navigate(['/b']);
        break;
      case UserRole.ADMIN:
        this.router.navigate(['/admin/verification']);
        break;
      default:
        this.router.navigate(['/auth/welcome']);
    }
  }
}
