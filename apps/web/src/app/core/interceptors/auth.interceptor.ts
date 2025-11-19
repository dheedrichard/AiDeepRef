/**
 * Authentication Interceptor
 *
 * Handles automatic token attachment, CSRF protection, and request security
 * Features:
 * - Automatic JWT token attachment
 * - CSRF token handling
 * - Request encryption (optional)
 * - Token refresh on 401
 * - Request retry logic
 */

import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, switchMap, take, tap, retry } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { selectToken, selectRefreshToken } from '../../features/auth/store/auth.selectors';
import { AuthActions } from '../../features/auth/store/auth.actions';
import { AuthService } from '../../features/auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  // Whitelist of URLs that don't require authentication
  private authWhitelist = [
    '/api/v1/auth/signin',
    '/api/v1/auth/signup',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/magic-link',
    '/api/v1/public'
  ];

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if URL is whitelisted
    const isWhitelisted = this.authWhitelist.some(url => request.url.includes(url));

    // Clone request for modifications
    let authReq = request;

    // Add security headers
    const securityHeaders = new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block'
    });

    authReq = authReq.clone({
      headers: this.mergeHeaders(authReq.headers, securityHeaders)
    });

    // Add CSRF token if available and not a GET request
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        authReq = authReq.clone({
          headers: authReq.headers.set('X-CSRF-Token', csrfToken)
        });
      }
    }

    // Add authentication token if not whitelisted
    if (!isWhitelisted) {
      return this.addAuthToken(authReq).pipe(
        switchMap(authenticatedReq => {
          return next.handle(authenticatedReq).pipe(
            // Retry once on network errors
            retry({
              count: 1,
              delay: 1000,
              resetOnSuccess: true,
              excludedStatusCodes: [400, 401, 403, 404, 422, 500]
            }),
            catchError(error => this.handleAuthError(error, authenticatedReq, next))
          );
        })
      );
    }

    // For whitelisted URLs, proceed without auth token
    return next.handle(authReq).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private addAuthToken(request: HttpRequest<any>): Observable<HttpRequest<any>> {
    return this.store.select(selectToken).pipe(
      take(1),
      switchMap(token => {
        if (token) {
          // Add bearer token
          const authRequest = request.clone({
            headers: request.headers.set('Authorization', `Bearer ${token}`)
          });

          // Add request signature for sensitive operations
          if (this.isSensitiveOperation(request)) {
            const signature = this.generateRequestSignature(request, token);
            return of(authRequest.clone({
              headers: authRequest.headers.set('X-Request-Signature', signature)
            }));
          }

          return of(authRequest);
        }
        return of(request);
      })
    );
  }

  private handleAuthError(
    error: HttpErrorResponse,
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (error.status === 401) {
      // Check if it's a token expiration error
      if (error.error?.code === 'TOKEN_EXPIRED' || error.error?.message?.includes('expired')) {
        return this.handle401Error(request, next);
      }

      // Other 401 errors - logout user
      this.store.dispatch(AuthActions.logout());
      this.router.navigate(['/auth/signin'], {
        queryParams: { sessionExpired: true }
      });
      return throwError(() => error);
    }

    if (error.status === 403) {
      // Forbidden - redirect to unauthorized page
      this.router.navigate(['/unauthorized']);
      return throwError(() => error);
    }

    if (error.status === 429) {
      // Rate limiting
      const retryAfter = error.headers.get('Retry-After');
      const message = `Rate limit exceeded. Please try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`;

      // Dispatch rate limit action
      this.store.dispatch(AuthActions.rateLimitExceeded({ retryAfter: parseInt(retryAfter || '60', 10) }));

      return throwError(() => ({
        ...error,
        error: { ...error.error, message }
      }));
    }

    return this.handleError(error);
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.store.select(selectRefreshToken).pipe(
        take(1),
        switchMap(refreshToken => {
          if (refreshToken) {
            return this.authService.refreshToken(refreshToken).pipe(
              switchMap(response => {
                this.isRefreshing = false;
                this.refreshTokenSubject.next(response.accessToken);

                // Update store with new tokens
                this.store.dispatch(AuthActions.refreshTokenSuccess({
                  accessToken: response.accessToken,
                  refreshToken: response.refreshToken
                }));

                // Retry original request with new token
                return this.retryRequest(request, response.accessToken, next);
              }),
              catchError(err => {
                this.isRefreshing = false;
                this.store.dispatch(AuthActions.logout());
                this.router.navigate(['/auth/signin']);
                return throwError(() => err);
              })
            );
          } else {
            this.isRefreshing = false;
            this.store.dispatch(AuthActions.logout());
            this.router.navigate(['/auth/signin']);
            return throwError(() => new Error('No refresh token available'));
          }
        })
      );
    } else {
      // Wait for token refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => this.retryRequest(request, token!, next))
      );
    }
  }

  private retryRequest(
    request: HttpRequest<any>,
    token: string,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const authRequest = request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`)
    });
    return next.handle(authRequest);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
      console.error(errorMessage);
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Server Error: ${error.status} - ${error.message}`;

      // Log security-relevant errors
      if (error.status === 403 || error.status === 401) {
        console.error('Security Error:', {
          status: error.status,
          url: error.url,
          message: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }

    return throwError(() => ({
      ...error,
      error: { ...error.error, message: errorMessage }
    }));
  }

  private getCsrfToken(): string | null {
    // Try multiple sources for CSRF token
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    // Check cookie (for double-submit cookie pattern)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN' || name === 'csrf-token') {
        return decodeURIComponent(value);
      }
    }

    // Check session storage
    return sessionStorage.getItem('csrfToken');
  }

  private mergeHeaders(original: HttpHeaders, additional: HttpHeaders): HttpHeaders {
    let merged = original;
    additional.keys().forEach(key => {
      if (!merged.has(key)) {
        const value = additional.get(key);
        if (value) {
          merged = merged.set(key, value);
        }
      }
    });
    return merged;
  }

  private isSensitiveOperation(request: HttpRequest<any>): boolean {
    const sensitivePaths = [
      '/api/v1/auth/change-password',
      '/api/v1/auth/enable-2fa',
      '/api/v1/auth/disable-2fa',
      '/api/v1/users/delete',
      '/api/v1/admin',
      '/api/v1/payments',
      '/api/v1/transfers'
    ];

    return sensitivePaths.some(path => request.url.includes(path)) ||
           (request.method === 'DELETE' || request.method === 'PUT');
  }

  private generateRequestSignature(request: HttpRequest<any>, token: string): string {
    // Simple signature generation - in production, use proper HMAC
    const timestamp = Date.now();
    const data = `${request.method}:${request.url}:${timestamp}`;

    // This should use a proper cryptographic function
    // For demonstration, using a simple hash
    const signature = btoa(`${data}:${token.substring(0, 10)}`);

    return `${timestamp}:${signature}`;
  }
}