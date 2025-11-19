/**
 * Auth Guard
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to the sign-in page.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectIsAuthenticated } from '../store/auth.selectors';

/**
 * Auth Guard Function
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'protected',
 *   component: ProtectedComponent,
 *   canActivate: [authGuard]
 * }
 * ```
 */
export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      }

      // Redirect to sign-in page
      return router.createUrlTree(['/auth/signin']);
    })
  );
};
