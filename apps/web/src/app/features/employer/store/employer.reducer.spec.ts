/**
 * Employer Reducer Unit Tests
 *
 * Tests state management for employer feature including
 * bundle loading, filtering, and analytics.
 */

import { employerReducer, initialState } from './employer.reducer';
import { EmployerActions } from './employer.actions';
import {
  Bundle,
  Reference,
  BundleAccessSession,
  BundleAccessType,
  ReferenceFormat,
  ReferenceStatus,
  AnalyticsEventType,
} from '../models/employer.models';

describe('EmployerReducer', () => {
  describe('unknown action', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' } as any;
      const result = employerReducer(initialState, action);

      expect(result).toBe(initialState);
    });
  });

  describe('Bundle Access Actions', () => {
    it('should handle requestBundleAccess', () => {
      const action = EmployerActions.requestBundleAccess({
        request: { bundleId: 'test123' },
      });
      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle requestBundleAccessSuccess', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
      };

      const bundle: Partial<Bundle> = {
        id: 'test123',
        title: 'Test Bundle',
        references: [],
      };

      const action = EmployerActions.requestBundleAccessSuccess({
        response: {
          success: true,
          session,
          bundle: bundle as Bundle,
        },
      });

      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(false);
      expect(result.currentBundle).toEqual(bundle);
      expect(result.session).toEqual(session);
      expect(result.error).toBeNull();
    });

    it('should handle requestBundleAccessFailure', () => {
      const error = 'Invalid password';
      const action = EmployerActions.requestBundleAccessFailure({ error });
      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Load Bundle Actions', () => {
    it('should handle loadBundle', () => {
      const action = EmployerActions.loadBundle({ bundleId: 'test123' });
      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle loadBundleSuccess', () => {
      const bundle: Partial<Bundle> = {
        id: 'test123',
        title: 'Test Bundle',
        references: [],
      };

      const action = EmployerActions.loadBundleSuccess({
        bundle: bundle as Bundle,
      });
      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(false);
      expect(result.currentBundle).toEqual(bundle);
      expect(result.error).toBeNull();
    });

    it('should handle loadBundleFailure', () => {
      const error = 'Bundle not found';
      const action = EmployerActions.loadBundleFailure({ error });
      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Reference Actions', () => {
    it('should handle viewReference', () => {
      const references: Partial<Reference>[] = [
        { id: 'ref1', format: ReferenceFormat.VIDEO },
        { id: 'ref2', format: ReferenceFormat.AUDIO },
      ];

      const stateWithBundle = {
        ...initialState,
        currentBundle: {
          id: 'test123',
          references: references as Reference[],
        } as Bundle,
      };

      const action = EmployerActions.viewReference({ referenceId: 'ref1' });
      const result = employerReducer(stateWithBundle, action);

      expect(result.currentReference).toEqual(references[0]);
    });

    it('should handle closeReference', () => {
      const stateWithReference = {
        ...initialState,
        currentReference: { id: 'ref1' } as Reference,
      };

      const action = EmployerActions.closeReference();
      const result = employerReducer(stateWithReference, action);

      expect(result.currentReference).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('should handle updateFilterOptions', () => {
      const filterOptions = {
        format: ReferenceFormat.VIDEO,
        minRcsScore: 80,
      };

      const action = EmployerActions.updateFilterOptions({ filterOptions });
      const result = employerReducer(initialState, action);

      expect(result.filterOptions.format).toBe(ReferenceFormat.VIDEO);
      expect(result.filterOptions.minRcsScore).toBe(80);
    });

    it('should handle clearFilters', () => {
      const stateWithFilters = {
        ...initialState,
        filterOptions: {
          format: ReferenceFormat.VIDEO,
          minRcsScore: 80,
          sortBy: 'rcsScore' as const,
          sortOrder: 'asc' as const,
        },
      };

      const action = EmployerActions.clearFilters();
      const result = employerReducer(stateWithFilters, action);

      expect(result.filterOptions.format).toBeUndefined();
      expect(result.filterOptions.minRcsScore).toBeUndefined();
      expect(result.filterOptions.sortBy).toBe('date');
      expect(result.filterOptions.sortOrder).toBe('desc');
    });
  });

  describe('Reach-Back Actions', () => {
    it('should handle requestReachBackSuccess', () => {
      const response = {
        requestId: 'req123',
        status: 'sent' as any,
        message: 'Request sent',
      };

      const action = EmployerActions.requestReachBackSuccess({ response });
      const result = employerReducer(initialState, action);

      expect(result.isLoading).toBe(false);
      expect(result.reachBackRequests.has('req123')).toBe(true);
      expect(result.reachBackRequests.get('req123')).toEqual(response);
      expect(result.error).toBeNull();
    });
  });

  describe('Analytics Actions', () => {
    it('should handle startBundleView', () => {
      const action = EmployerActions.startBundleView({ bundleId: 'test123' });
      const result = employerReducer(initialState, action);

      expect(result.analytics.viewStartTime).toBeTruthy();
      expect(result.analytics.viewStartTime).toBeGreaterThan(0);
    });

    it('should handle endBundleView', () => {
      const stateWithView = {
        ...initialState,
        analytics: {
          viewStartTime: Date.now() - 60000, // 1 minute ago
          eventsQueue: [],
        },
      };

      const action = EmployerActions.endBundleView({ bundleId: 'test123' });
      const result = employerReducer(stateWithView, action);

      expect(result.analytics.viewStartTime).toBeNull();
    });

    it('should handle trackEvent', () => {
      const event = {
        eventType: AnalyticsEventType.BUNDLE_VIEW,
        bundleId: 'test123',
        sessionId: 'session123',
        timestamp: Date.now(),
      };

      const action = EmployerActions.trackEvent({ event });
      const result = employerReducer(initialState, action);

      expect(result.analytics.eventsQueue.length).toBe(1);
      expect(result.analytics.eventsQueue[0]).toEqual(event);
    });

    it('should handle trackEventSuccess', () => {
      const stateWithEvents = {
        ...initialState,
        analytics: {
          viewStartTime: null,
          eventsQueue: [
            {
              eventType: AnalyticsEventType.BUNDLE_VIEW,
              bundleId: 'test123',
              sessionId: 'session123',
              timestamp: Date.now(),
            },
          ],
        },
      };

      const action = EmployerActions.trackEventSuccess();
      const result = employerReducer(stateWithEvents, action);

      expect(result.analytics.eventsQueue.length).toBe(0);
    });
  });

  describe('Session Actions', () => {
    it('should handle updateSession', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
      };

      const action = EmployerActions.updateSession({ session });
      const result = employerReducer(initialState, action);

      expect(result.session).toEqual(session);
    });

    it('should handle clearSession', () => {
      const stateWithSession = {
        ...initialState,
        session: {
          bundleId: 'test123',
          accessType: BundleAccessType.GUEST,
          sessionId: 'session123',
          expiresAt: Date.now() + 86400000,
        },
        currentBundle: { id: 'test123' } as Bundle,
      };

      const action = EmployerActions.clearSession();
      const result = employerReducer(stateWithSession, action);

      expect(result.session).toBeNull();
      expect(result.currentBundle).toBeNull();
      expect(result.currentReference).toBeNull();
    });

    it('should handle sessionExpired', () => {
      const action = EmployerActions.sessionExpired();
      const result = employerReducer(initialState, action);

      expect(result.session).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('expired');
    });
  });

  describe('Error Handling', () => {
    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error occurred',
      };

      const action = EmployerActions.clearError();
      const result = employerReducer(stateWithError, action);

      expect(result.error).toBeNull();
    });

    it('should handle handleExpiredBundle', () => {
      const stateWithBundle = {
        ...initialState,
        currentBundle: { id: 'test123' } as Bundle,
        session: {
          bundleId: 'test123',
          accessType: BundleAccessType.GUEST,
          sessionId: 'session123',
          expiresAt: Date.now(),
        },
      };

      const action = EmployerActions.handleExpiredBundle();
      const result = employerReducer(stateWithBundle, action);

      expect(result.currentBundle).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('expired');
    });

    it('should handle handleAccessDenied', () => {
      const reason = 'Invalid credentials';
      const action = EmployerActions.handleAccessDenied({ reason });
      const result = employerReducer(initialState, action);

      expect(result.error).toContain(reason);
      expect(result.isLoading).toBe(false);
    });
  });
});
