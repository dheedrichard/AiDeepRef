import { Injectable, inject, PLATFORM_ID, TransferState, makeStateKey, StateKey } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

/**
 * Base API Service with TransferState support
 *
 * Provides a foundation for API services with automatic server-side rendering
 * data transfer to avoid duplicate API calls during hydration.
 *
 * Features:
 * - Automatic TransferState caching for GET requests
 * - Platform-aware (server vs browser)
 * - Prevents duplicate API calls during SSR hydration
 * - Type-safe state keys
 *
 * Usage:
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class MyApiService extends BaseApiService {
 *   getData(): Observable<MyData> {
 *     return this.getWithTransferState('my-data', '/api/my-data');
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class BaseApiService {
  protected http = inject(HttpClient);
  protected transferState = inject(TransferState);
  protected platformId = inject(PLATFORM_ID);

  /**
   * Performs a GET request with TransferState support
   *
   * On the server: Fetches data and stores it in TransferState
   * On the client (first load): Retrieves data from TransferState if available
   * On the client (subsequent calls): Performs normal HTTP request
   *
   * @param stateKey - Unique key for storing/retrieving data
   * @param url - API endpoint URL
   * @param defaultValue - Optional default value if no cached data exists
   * @returns Observable of the response data
   */
  protected getWithTransferState<T>(
    stateKey: string,
    url: string,
    defaultValue: T | null = null
  ): Observable<T> {
    const key: StateKey<T> = makeStateKey<T>(stateKey);

    // In browser, check if data exists in transfer state
    if (isPlatformBrowser(this.platformId)) {
      const cachedData = this.transferState.get(key, defaultValue);
      if (cachedData !== null && cachedData !== defaultValue) {
        // Remove from transfer state to prevent memory leaks
        this.transferState.remove(key);
        return of(cachedData as T);
      }
    }

    // Fetch data from API
    return this.http.get<T>(url).pipe(
      tap((data) => {
        // On server, store data in transfer state
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(key, data);
        }
      })
    );
  }

  /**
   * Performs a POST request (no TransferState support as POST is not idempotent)
   *
   * @param url - API endpoint URL
   * @param body - Request body
   * @returns Observable of the response data
   */
  protected post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(url, body);
  }

  /**
   * Performs a PUT request (no TransferState support)
   *
   * @param url - API endpoint URL
   * @param body - Request body
   * @returns Observable of the response data
   */
  protected put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(url, body);
  }

  /**
   * Performs a PATCH request (no TransferState support)
   *
   * @param url - API endpoint URL
   * @param body - Request body
   * @returns Observable of the response data
   */
  protected patch<T>(url: string, body: any): Observable<T> {
    return this.http.patch<T>(url, body);
  }

  /**
   * Performs a DELETE request (no TransferState support)
   *
   * @param url - API endpoint URL
   * @returns Observable of the response data
   */
  protected delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }

  /**
   * Checks if running in browser
   */
  protected get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Checks if running on server
   */
  protected get isServer(): boolean {
    return isPlatformServer(this.platformId);
  }
}
