/**
 * Error Interceptor
 *
 * Global error handling for HTTP requests with security-aware logging
 * Features:
 * - Centralized error handling
 * - Security event logging
 * - User-friendly error messages
 * - Retry logic for transient errors
 * - Circuit breaker pattern
 */

import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, mergeMap, retryWhen, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';

interface ErrorConfig {
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  showNotification?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private readonly defaultConfig: ErrorConfig = {
    retry: true,
    maxRetries: 3,
    retryDelay: 1000,
    showNotification: true,
    logToConsole: true,
    logToServer: true
  };

  // Circuit breaker configuration
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeout = 30000; // 30 seconds

  // Error messages mapping
  private readonly errorMessages = new Map<number, string>([
    [400, 'Invalid request. Please check your input.'],
    [401, 'Authentication required. Please sign in.'],
    [403, 'You do not have permission to perform this action.'],
    [404, 'The requested resource was not found.'],
    [408, 'Request timeout. Please try again.'],
    [409, 'Conflict detected. Please refresh and try again.'],
    [422, 'Validation failed. Please check your input.'],
    [429, 'Too many requests. Please wait before trying again.'],
    [500, 'Server error. Please try again later.'],
    [502, 'Service temporarily unavailable.'],
    [503, 'Service under maintenance. Please try again later.'],
    [504, 'Gateway timeout. Please try again.']
  ]);

  constructor(
    private router: Router,
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const endpoint = this.getEndpointKey(request);

    // Check circuit breaker
    if (this.isCircuitOpen(endpoint)) {
      return throwError(() => new Error('Service temporarily unavailable. Circuit breaker is open.'));
    }

    return next.handle(request).pipe(
      retryWhen(errors => this.retryStrategy(errors, request)),
      catchError(error => this.handleError(error, request))
    );
  }

  private retryStrategy(errors: Observable<any>, request: HttpRequest<any>): Observable<any> {
    const config = this.getErrorConfig(request);

    return errors.pipe(
      mergeMap((error, index) => {
        const retryCount = index + 1;

        // Don't retry if disabled or max retries reached
        if (!config.retry || retryCount > config.maxRetries!) {
          return throwError(() => error);
        }

        // Don't retry certain status codes
        if (error instanceof HttpErrorResponse) {
          const nonRetryableStatuses = [400, 401, 403, 404, 409, 422];
          if (nonRetryableStatuses.includes(error.status)) {
            return throwError(() => error);
          }
        }

        // Calculate exponential backoff
        const delay = config.retryDelay! * Math.pow(2, retryCount - 1);

        console.log(`Retry attempt ${retryCount} for ${request.url} after ${delay}ms`);

        return timer(delay);
      })
    );
  }

  private handleError(error: HttpErrorResponse, request: HttpRequest<any>): Observable<never> {
    const config = this.getErrorConfig(request);
    const endpoint = this.getEndpointKey(request);

    // Update circuit breaker
    this.updateCircuitBreaker(endpoint, error);

    // Log to console if enabled
    if (config.logToConsole) {
      this.logError(error, request);
    }

    // Log to server for security-relevant errors
    if (config.logToServer && this.isSecurityError(error)) {
      this.logSecurityError(error, request);
    }

    // Handle specific error types
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          this.handle401Error(error);
          break;
        case 403:
          this.handle403Error(error);
          break;
        case 429:
          this.handle429Error(error);
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          this.handleServerError(error);
          break;
      }
    }

    // Show user notification if enabled
    if (config.showNotification) {
      this.showErrorNotification(error);
    }

    // Extract error message
    const errorMessage = this.extractErrorMessage(error);

    return throwError(() => ({
      ...error,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      requestUrl: request.url,
      requestMethod: request.method
    }));
  }

  private handle401Error(error: HttpErrorResponse): void {
    // Clear auth state and redirect to login
    sessionStorage.setItem('lastError', '401');
    sessionStorage.setItem('returnUrl', this.router.url);

    // Don't redirect for auth endpoints
    if (!error.url?.includes('/auth/')) {
      this.router.navigate(['/auth/signin'], {
        queryParams: { sessionExpired: true }
      });
    }
  }

  private handle403Error(error: HttpErrorResponse): void {
    // Log potential security violation
    console.error('Access denied:', {
      url: error.url,
      timestamp: new Date().toISOString()
    });

    // Navigate to unauthorized page
    this.router.navigate(['/unauthorized']);
  }

  private handle429Error(error: HttpErrorResponse): void {
    const retryAfter = error.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter, 10) : 60;

    // Store rate limit info
    sessionStorage.setItem('rateLimitedUntil',
      (Date.now() + waitTime * 1000).toString()
    );

    // Show specific rate limit message
    this.snackBar.open(
      `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
      'Dismiss',
      { duration: 10000, panelClass: 'error-snackbar' }
    );
  }

  private handleServerError(error: HttpErrorResponse): void {
    // Track server errors for monitoring
    const serverErrors = JSON.parse(
      sessionStorage.getItem('serverErrors') || '[]'
    );

    serverErrors.push({
      status: error.status,
      url: error.url,
      timestamp: Date.now()
    });

    // Keep only last 10 errors
    if (serverErrors.length > 10) {
      serverErrors.shift();
    }

    sessionStorage.setItem('serverErrors', JSON.stringify(serverErrors));

    // Check if multiple server errors in short time (possible outage)
    const recentErrors = serverErrors.filter(
      (e: any) => Date.now() - e.timestamp < 60000 // Last minute
    );

    if (recentErrors.length >= 3) {
      this.snackBar.open(
        'We are experiencing technical difficulties. Please try again later.',
        'Dismiss',
        { duration: 10000, panelClass: 'error-snackbar' }
      );
    }
  }

  private showErrorNotification(error: HttpErrorResponse): void {
    const message = this.extractErrorMessage(error);

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: 'error-snackbar',
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    // Check for custom error message from server
    if (error.error?.message) {
      return error.error.message;
    }

    // Check for validation errors
    if (error.error?.errors) {
      const errors = error.error.errors;
      if (Array.isArray(errors)) {
        return errors.join(', ');
      }
      if (typeof errors === 'object') {
        return Object.values(errors).flat().join(', ');
      }
    }

    // Use predefined message based on status code
    if (error.status && this.errorMessages.has(error.status)) {
      return this.errorMessages.get(error.status)!;
    }

    // Network error
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }

    // Default message
    return 'An unexpected error occurred. Please try again.';
  }

  private logError(error: HttpErrorResponse, request: HttpRequest<any>): void {
    console.error('HTTP Error:', {
      status: error.status,
      message: error.message,
      url: request.url,
      method: request.method,
      error: error.error,
      timestamp: new Date().toISOString()
    });
  }

  private logSecurityError(error: HttpErrorResponse, request: HttpRequest<any>): void {
    // Send security error to logging service
    const securityLog = {
      type: 'SECURITY_ERROR',
      status: error.status,
      url: request.url,
      method: request.method,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      error: error.error
    };

    // This would normally send to a logging service
    console.error('Security Error Log:', securityLog);

    // Store locally for debugging
    const securityLogs = JSON.parse(
      sessionStorage.getItem('securityLogs') || '[]'
    );
    securityLogs.push(securityLog);
    sessionStorage.setItem('securityLogs', JSON.stringify(securityLogs));
  }

  private isSecurityError(error: HttpErrorResponse): boolean {
    // Security-relevant status codes
    const securityStatuses = [401, 403, 429];

    // Security-relevant URLs
    const securityUrls = ['/auth/', '/admin/', '/api/v1/users/'];

    return securityStatuses.includes(error.status) ||
           securityUrls.some(url => error.url?.includes(url));
  }

  private getErrorConfig(request: HttpRequest<any>): ErrorConfig {
    // Custom configurations based on request
    if (request.url.includes('/api/v1/auth/')) {
      return {
        ...this.defaultConfig,
        retry: false // Don't retry auth requests
      };
    }

    if (request.url.includes('/api/v1/admin/')) {
      return {
        ...this.defaultConfig,
        maxRetries: 1, // Limited retries for admin requests
        logToServer: true
      };
    }

    return this.defaultConfig;
  }

  private getEndpointKey(request: HttpRequest<any>): string {
    // Extract base endpoint for circuit breaker tracking
    const url = new URL(request.url, window.location.origin);
    return `${request.method}:${url.pathname}`;
  }

  private isCircuitOpen(endpoint: string): boolean {
    const state = this.circuitBreakers.get(endpoint);

    if (!state) {
      return false;
    }

    if (state.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - state.lastFailureTime > this.circuitBreakerTimeout) {
        // Move to half-open state
        state.state = 'HALF_OPEN';
        state.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private updateCircuitBreaker(endpoint: string, error: HttpErrorResponse): void {
    // Don't track client errors for circuit breaker
    if (error.status >= 400 && error.status < 500) {
      return;
    }

    let state = this.circuitBreakers.get(endpoint);

    if (!state) {
      state = {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED'
      };
      this.circuitBreakers.set(endpoint, state);
    }

    if (error.status >= 500) {
      state.failures++;
      state.lastFailureTime = Date.now();

      if (state.failures >= this.circuitBreakerThreshold) {
        state.state = 'OPEN';
        console.warn(`Circuit breaker OPEN for ${endpoint}`);
      }
    } else if (state.state === 'HALF_OPEN') {
      // Success in half-open state, close the circuit
      state.state = 'CLOSED';
      state.failures = 0;
    }
  }
}