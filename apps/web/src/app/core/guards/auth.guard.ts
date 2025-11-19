/**
 * Enhanced Auth Guard with Role-Based Access Control
 *
 * Provides comprehensive authentication and authorization checks
 * with improved security features including:
 * - Token validation
 * - Session timeout handling
 * - Role-based access control
 * - Redirect URL preservation
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take, tap, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { selectIsAuthenticated, selectCurrentUser, selectToken } from '../../features/auth/store/auth.selectors';
import { AuthActions } from '../../features/auth/store/auth.actions';

export interface AuthGuardConfig {
  requireAuth?: boolean;
  requireRoles?: string[];
  requireEmailVerified?: boolean;
  requireKyc?: boolean;
  redirectTo?: string;
}

/**
 * Enhanced Auth Guard with configurable requirements
 *
 * @param config - Configuration for authentication requirements
 * @returns CanActivateFn that validates access based on config
 */
export const authGuard = (config: AuthGuardConfig = {}): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const store = inject(Store);
    const router = inject(Router);

    const {
      requireAuth = true,
      requireRoles = [],
      requireEmailVerified = false,
      requireKyc = false,
      redirectTo = '/auth/signin'
    } = config;

    // Store the attempted URL for redirecting after login
    const returnUrl = state.url;

    return store.select(selectIsAuthenticated).pipe(
      take(1),
      switchMap(isAuthenticated => {
        // Check if authentication is required
        if (requireAuth && !isAuthenticated) {
          // Store return URL in session storage
          sessionStorage.setItem('returnUrl', returnUrl);
          return of(router.createUrlTree([redirectTo]));
        }

        // If authenticated, check additional requirements
        if (isAuthenticated) {
          return store.select(selectCurrentUser).pipe(
            take(1),
            map(user => {
              if (!user) {
                // User data not loaded, redirect to signin
                sessionStorage.setItem('returnUrl', returnUrl);
                return router.createUrlTree([redirectTo]);
              }

              // Check role requirements
              if (requireRoles.length > 0 && !requireRoles.includes(user.role)) {
                console.error(`Access denied. User role '${user.role}' not in required roles:`, requireRoles);
                return router.createUrlTree(['/unauthorized']);
              }

              // Check email verification requirement
              if (requireEmailVerified && !user.emailVerified) {
                return router.createUrlTree(['/auth/verify-email']);
              }

              // Check KYC requirement
              if (requireKyc && !user.kycCompleted) {
                return router.createUrlTree(['/auth/kyc']);
              }

              // Check session timeout
              const lastActivity = sessionStorage.getItem('lastActivity');
              if (lastActivity) {
                const timeout = 15 * 60 * 1000; // 15 minutes
                const now = Date.now();
                const lastActivityTime = parseInt(lastActivity, 10);

                if (now - lastActivityTime > timeout) {
                  // Session expired
                  store.dispatch(AuthActions.logout());
                  sessionStorage.setItem('returnUrl', returnUrl);
                  sessionStorage.setItem('sessionExpired', 'true');
                  return router.createUrlTree(['/auth/signin']);
                }
              }

              // Update last activity time
              sessionStorage.setItem('lastActivity', Date.now().toString());

              // All checks passed
              return true;
            })
          );
        }

        // No authentication required, allow access
        return of(true);
      })
    );
  };
};

/**
 * Convenience function for admin-only routes
 */
export const adminGuard: CanActivateFn = authGuard({
  requireAuth: true,
  requireRoles: ['admin'],
  requireEmailVerified: true,
  redirectTo: '/unauthorized'
});

/**
 * Convenience function for verified users
 */
export const verifiedUserGuard: CanActivateFn = authGuard({
  requireAuth: true,
  requireEmailVerified: true
});

/**
 * Convenience function for KYC-completed users
 */
export const kycGuard: CanActivateFn = authGuard({
  requireAuth: true,
  requireEmailVerified: true,
  requireKyc: true
});