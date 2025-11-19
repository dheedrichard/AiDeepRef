import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideRouterStore } from '@ngrx/router-store';

import { routes } from './app.routes';
import { authFeatureKey, authReducer } from './features/auth/store/auth.reducer';
import { AuthEffects } from './features/auth/store/auth.effects';

/**
 * DeepRef Application Configuration
 *
 * Provides:
 * - Router with view transitions and component input binding
 * - HTTP client with fetch API and interceptors
 * - Animations (async loaded)
 * - NgRx Store for state management
 * - NgRx Effects for side effects
 * - NgRx Router Store for router state
 * - NgRx Store Devtools (development only)
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Browser error listeners
    provideBrowserGlobalErrorListeners(),

    // Zone.js configuration with event coalescing for better performance
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router configuration with modern features
    provideRouter(
      routes,
      withComponentInputBinding(), // Bind route params to component inputs
      withViewTransitions() // Enable view transitions API
    ),

    // HTTP client with fetch API and interceptors
    provideHttpClient(
      withFetch(), // Use fetch API instead of XMLHttpRequest
      withInterceptors([
        // TODO: Add auth interceptor
        // authInterceptor,
        // TODO: Add error interceptor
        // errorInterceptor,
      ])
    ),

    // Animations (async loaded for better initial load performance)
    provideAnimationsAsync(),

    // NgRx Store - State management
    provideStore(
      {
        // Auth feature reducer
        [authFeatureKey]: authReducer,
      },
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: true,
          strictActionSerializability: true,
          strictActionWithinNgZone: true,
          strictActionTypeUniqueness: true,
        },
      }
    ),

    // NgRx Effects - Side effects management
    provideEffects([
      // Auth effects
      AuthEffects,
    ]),

    // NgRx Router Store - Router state in store
    provideRouterStore(),

    // NgRx Store Devtools - Development only
    provideStoreDevtools({
      maxAge: 25, // Retains last 25 states
      logOnly: !isDevMode(), // Restrict extension to log-only mode in production
      autoPause: true, // Pauses recording actions and state changes when the extension window is not open
      trace: false, // If set to true, will include stack trace for every dispatched action
      traceLimit: 75, // Maximum stack trace frames to be stored (in case trace option was provided as true)
    }),
  ],
};
