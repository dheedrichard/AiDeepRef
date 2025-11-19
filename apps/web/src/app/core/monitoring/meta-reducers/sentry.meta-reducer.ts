import { ActionReducer, Action } from '@ngrx/store';
import * as Sentry from '@sentry/angular';

/**
 * Meta-reducer that logs NgRx actions to Sentry as breadcrumbs
 * and tracks state changes for debugging
 */
export function sentryMetaReducer<S, A extends Action = Action>(
  reducer: ActionReducer<S, A>
): ActionReducer<S, A> {
  return function (state: S | undefined, action: A): S {
    // Track action as breadcrumb
    if (shouldTrackAction(action)) {
      Sentry.addBreadcrumb({
        message: `Redux Action: ${action.type}`,
        category: 'redux.action',
        level: 'info',
        data: {
          type: action.type,
          // Only include action payload if it's not sensitive
          payload: sanitizeActionPayload(action),
        },
        timestamp: Date.now() / 1000,
      });
    }

    let nextState: S;
    const startTime = performance.now();

    try {
      // Execute reducer
      nextState = reducer(state, action);

      // Track slow reducers
      const duration = performance.now() - startTime;
      if (duration > 50) {
        // Log slow state updates
        Sentry.addBreadcrumb({
          message: `Slow reducer: ${action.type} took ${duration.toFixed(2)}ms`,
          category: 'redux.performance',
          level: 'warning',
          data: {
            type: action.type,
            duration,
          },
        });

        // Track metric
        Sentry.metrics.distribution('state.update_duration', duration, {
          unit: 'millisecond',
          tags: {
            action_type: action.type,
          },
        });
      }
    } catch (error) {
      // Capture reducer errors
      Sentry.captureException(error, {
        tags: {
          action_type: action.type,
          error_source: 'ngrx_reducer',
        },
        extra: {
          action,
          state: sanitizeState(state),
        },
        level: 'error',
      });

      // Re-throw to maintain normal error handling
      throw error;
    }

    // Track state changes for specific slices
    if (shouldTrackStateChange(action)) {
      Sentry.setContext('redux.state', {
        lastAction: action.type,
        stateSnapshot: sanitizeState(nextState),
      });
    }

    return nextState;
  };
}

/**
 * Determine if action should be tracked
 */
function shouldTrackAction(action: Action): boolean {
  const type = action.type;

  // Don't track certain noisy actions
  const ignoredActions = [
    '@ngrx/store/init',
    '@ngrx/effects/init',
    '@ngrx/store-devtools',
    '@ngrx/router-store',
  ];

  return !ignoredActions.some((ignored) => type.includes(ignored));
}

/**
 * Determine if state change should be tracked in context
 */
function shouldTrackStateChange(action: Action): boolean {
  const type = action.type;

  // Only track important state changes
  const trackedActions = [
    'auth',
    'error',
    'user',
    'references',
    'bundles',
  ];

  return trackedActions.some((tracked) => type.toLowerCase().includes(tracked));
}

/**
 * Sanitize action payload to remove sensitive data
 */
function sanitizeActionPayload(action: any): any {
  if (!action) {
    return null;
  }

  // Clone action to avoid mutating original
  const sanitized = { ...action };

  // Remove the type as it's already in the breadcrumb message
  delete sanitized.type;

  // Remove sensitive fields
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];

  const removeSensitiveData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => removeSensitiveData(item));
    }

    const cleaned: any = {};
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        cleaned[key] = '[FILTERED]';
      } else {
        cleaned[key] = removeSensitiveData(obj[key]);
      }
    }
    return cleaned;
  };

  return removeSensitiveData(sanitized);
}

/**
 * Sanitize state to remove sensitive data
 */
function sanitizeState(state: any): any {
  if (!state || typeof state !== 'object') {
    return null;
  }

  // Only include keys that are safe to log
  const safeKeys = ['ui', 'router', 'loading', 'error'];
  const sanitized: any = {};

  for (const key in state) {
    if (safeKeys.includes(key)) {
      sanitized[key] = state[key];
    }
  }

  return sanitized;
}

/**
 * Meta-reducer for tracking effects errors
 */
export function sentryEffectsMetaReducer<S, A extends Action = Action>(
  reducer: ActionReducer<S, A>
): ActionReducer<S, A> {
  return function (state: S | undefined, action: A): S {
    // Track effect errors
    if (action.type.includes('[Error]') || action.type.includes('failure')) {
      Sentry.captureMessage(`Effect Error: ${action.type}`, {
        level: 'error',
        tags: {
          action_type: action.type,
          error_source: 'ngrx_effect',
        },
        extra: {
          action: sanitizeActionPayload(action),
        },
      });
    }

    return reducer(state, action);
  };
}
