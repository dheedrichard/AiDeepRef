/**
 * Admin Guard
 *
 * Specialized guard for admin-only routes with enhanced security
 * Features:
 * - Admin role verification
 * - Two-factor authentication check (when enabled)
 * - Audit logging for admin access
 * - IP whitelisting (configurable)
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { selectCurrentUser, selectIsAuthenticated } from '../../features/auth/store/auth.selectors';
import { HttpClient } from '@angular/common/http';

export interface AdminGuardConfig {
  requireTwoFactor?: boolean;
  allowedIPs?: string[];
  logAccess?: boolean;
}

/**
 * Admin Guard with enhanced security checks
 *
 * @param config - Configuration for admin access requirements
 * @returns CanActivateFn that validates admin access
 */
export const adminGuard = (config: AdminGuardConfig = {}): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const store = inject(Store);
    const router = inject(Router);
    const http = inject(HttpClient);

    const {
      requireTwoFactor = false,
      allowedIPs = [],
      logAccess = true
    } = config;

    const returnUrl = state.url;

    return store.select(selectIsAuthenticated).pipe(
      take(1),
      switchMap(isAuthenticated => {
        if (!isAuthenticated) {
          sessionStorage.setItem('returnUrl', returnUrl);
          sessionStorage.setItem('adminAttempt', 'true');
          return of(router.createUrlTree(['/auth/signin']));
        }

        return store.select(selectCurrentUser).pipe(
          take(1),
          switchMap(user => {
            if (!user) {
              sessionStorage.setItem('returnUrl', returnUrl);
              return of(router.createUrlTree(['/auth/signin']));
            }

            // Check if user is admin
            if (user.role !== 'admin') {
              // Log unauthorized admin access attempt
              if (logAccess) {
                http.post('/api/v1/audit/log', {
                  event: 'ADMIN_ACCESS_DENIED',
                  userId: user.id,
                  email: user.email,
                  role: user.role,
                  attemptedUrl: returnUrl,
                  timestamp: new Date().toISOString()
                }).subscribe({
                  error: (err) => console.error('Failed to log admin access denial:', err)
                });
              }

              return of(router.createUrlTree(['/unauthorized']));
            }

            // Check email verification
            if (!user.emailVerified) {
              return of(router.createUrlTree(['/auth/verify-email']));
            }

            // Check two-factor authentication requirement
            if (requireTwoFactor && !user.twoFactorEnabled) {
              sessionStorage.setItem('returnUrl', returnUrl);
              return of(router.createUrlTree(['/auth/setup-2fa']));
            }

            if (requireTwoFactor && !sessionStorage.getItem('twoFactorVerified')) {
              sessionStorage.setItem('returnUrl', returnUrl);
              return of(router.createUrlTree(['/auth/verify-2fa']));
            }

            // Check IP whitelist if configured
            if (allowedIPs.length > 0) {
              // This would normally check against the user's IP
              // For now, we'll implement client-side check
              // In production, this should be server-side
              const userIP = sessionStorage.getItem('userIP') || '';
              if (!allowedIPs.includes(userIP)) {
                if (logAccess) {
                  http.post('/api/v1/audit/log', {
                    event: 'ADMIN_IP_BLOCKED',
                    userId: user.id,
                    email: user.email,
                    ip: userIP,
                    attemptedUrl: returnUrl,
                    timestamp: new Date().toISOString()
                  }).subscribe({
                    error: (err) => console.error('Failed to log IP block:', err)
                  });
                }
                return of(router.createUrlTree(['/unauthorized']));
              }
            }

            // Check session age for admin (shorter timeout)
            const lastActivity = sessionStorage.getItem('lastActivity');
            if (lastActivity) {
              const adminTimeout = 10 * 60 * 1000; // 10 minutes for admin
              const now = Date.now();
              const lastActivityTime = parseInt(lastActivity, 10);

              if (now - lastActivityTime > adminTimeout) {
                // Admin session expired
                sessionStorage.setItem('returnUrl', returnUrl);
                sessionStorage.setItem('sessionExpired', 'true');
                sessionStorage.setItem('adminSessionExpired', 'true');
                return of(router.createUrlTree(['/auth/signin']));
              }
            }

            // Log successful admin access
            if (logAccess) {
              http.post('/api/v1/audit/log', {
                event: 'ADMIN_ACCESS_GRANTED',
                userId: user.id,
                email: user.email,
                accessedUrl: returnUrl,
                timestamp: new Date().toISOString()
              }).subscribe({
                error: (err) => console.error('Failed to log admin access:', err)
              });
            }

            // Update last activity time
            sessionStorage.setItem('lastActivity', Date.now().toString());
            sessionStorage.setItem('lastAdminActivity', Date.now().toString());

            // All checks passed
            return of(true);
          })
        );
      })
    );
  };
};

/**
 * Super Admin Guard - highest level of access
 */
export const superAdminGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectCurrentUser).pipe(
    take(1),
    map(user => {
      if (!user || user.role !== 'super_admin') {
        // Log super admin access attempt
        console.error('Unauthorized super admin access attempt:', {
          userId: user?.id,
          role: user?.role,
          attemptedUrl: state.url
        });
        return router.createUrlTree(['/unauthorized']);
      }

      // Additional super admin checks could go here
      // e.g., hardware key verification, biometric auth, etc.

      return true;
    })
  );
};

/**
 * System Admin Guard - for system maintenance routes
 */
export const systemAdminGuard: CanActivateFn = adminGuard({
  requireTwoFactor: true,
  logAccess: true
});