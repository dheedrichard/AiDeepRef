/**
 * KYC Guard
 *
 * Protects routes that require KYC verification (for seekers).
 * Redirects users with incomplete KYC to the ID verification flow.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import {
  selectIsSeeker,
  selectIsKycVerified,
  selectKycStatus,
} from '../store/auth.selectors';
import { KycStatus } from '../models/auth.models';
import { combineLatest } from 'rxjs';

/**
 * KYC Guard Function
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'seeker/dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard, kycGuard]
 * }
 * ```
 */
export const kycGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return combineLatest([
    store.select(selectIsSeeker),
    store.select(selectIsKycVerified),
    store.select(selectKycStatus),
  ]).pipe(
    take(1),
    map(([isSeeker, isKycVerified, kycStatus]) => {
      // If not a seeker, allow access (KYC not required)
      if (!isSeeker) {
        return true;
      }

      // If seeker and KYC verified, allow access
      if (isKycVerified) {
        return true;
      }

      // If seeker with incomplete KYC, redirect to appropriate step
      switch (kycStatus) {
        case KycStatus.NOT_STARTED:
        case KycStatus.ID_PENDING:
          return router.createUrlTree(['/auth/id-capture']);
        case KycStatus.SELFIE_PENDING:
          return router.createUrlTree(['/auth/selfie-capture']);
        case KycStatus.UNDER_REVIEW:
          return router.createUrlTree(['/auth/verification-result']);
        case KycStatus.REJECTED:
          return router.createUrlTree(['/auth/verification-result']);
        default:
          return router.createUrlTree(['/auth/id-capture']);
      }
    })
  );
};
