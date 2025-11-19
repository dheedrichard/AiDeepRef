/**
 * Bundle Session Guard
 *
 * Protects employer routes by ensuring valid bundle access session exists.
 * Redirects to bundle access page if session is invalid or expired.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { BundleAccessService } from '../services/bundle-access.service';

export const bundleSessionGuard: CanActivateFn = (route, state) => {
  const bundleAccess = inject(BundleAccessService);
  const router = inject(Router);

  // Check if valid session exists
  if (bundleAccess.isSessionValid()) {
    return true;
  }

  // No valid session - redirect to access page
  return router.createUrlTree(['/employer/bundle-access'], {
    queryParams: {
      error: 'session_expired',
      returnUrl: state.url,
    },
  });
};
