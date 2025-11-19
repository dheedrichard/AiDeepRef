/**
 * Seeker Reducer Tests
 */

import { seekerReducer, initialSeekerState } from './seeker.reducer';
import {
  DashboardActions,
  ReferenceActions,
  BundleActions,
  SeekerUIActions,
} from './seeker.actions';
import { ReferenceRequestStatus, ReferenceFormat, BundleStatus } from '../models/seeker.models';

describe('Seeker Reducer', () => {
  describe('Dashboard Actions', () => {
    it('should handle loadDashboard', () => {
      const action = DashboardActions.loadDashboard();
      const state = seekerReducer(initialSeekerState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle loadDashboardSuccess', () => {
      const stats = {
        totalReferences: 5,
        completedReferences: 4,
        pendingReferences: 1,
        averageRCS: 85,
        totalBundles: 2,
        activeBundles: 2,
        totalRequests: 10,
        pendingRequests: 3,
      };
      const recentActivity = [
        {
          id: '1',
          type: 'request_sent' as const,
          title: 'Request sent',
          description: 'Sent to John Doe',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      const action = DashboardActions.loadDashboardSuccess({ stats, recentActivity });
      const state = seekerReducer(initialSeekerState, action);

      expect(state.dashboardStats).toEqual(stats);
      expect(state.recentActivity).toEqual(recentActivity);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle loadDashboardFailure', () => {
      const error = 'Failed to load dashboard';
      const action = DashboardActions.loadDashboardFailure({ error });
      const state = seekerReducer(initialSeekerState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Reference Actions', () => {
    it('should handle loadReferences', () => {
      const action = ReferenceActions.loadReferences({});
      const state = seekerReducer(initialSeekerState, action);

      expect(state.isLoadingReferences).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle loadReferencesSuccess', () => {
      const references = [
        {
          id: '1',
          requestId: '1',
          seekerId: '123',
          referrerId: '456',
          referrerName: 'John Doe',
          referrerEmail: 'john@example.com',
          company: 'Acme Corp',
          role: 'Manager',
          format: ReferenceFormat.VIDEO,
          rcsScore: 90,
          status: ReferenceRequestStatus.COMPLETED,
          isVerified: true,
          responses: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const action = ReferenceActions.loadReferencesSuccess({ references });
      const state = seekerReducer(initialSeekerState, action);

      expect(state.references).toEqual(references);
      expect(state.isLoadingReferences).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle applyFilters', () => {
      const filters = { minRCS: 80, status: [ReferenceRequestStatus.COMPLETED] };
      const action = ReferenceActions.applyFilters({ filters });
      const state = seekerReducer(initialSeekerState, action);

      expect(state.referenceFilters).toEqual(filters);
    });

    it('should handle clearFilters', () => {
      const stateWithFilters = {
        ...initialSeekerState,
        referenceFilters: { minRCS: 80 },
      };

      const action = ReferenceActions.clearFilters();
      const state = seekerReducer(stateWithFilters, action);

      expect(state.referenceFilters).toEqual({});
    });
  });

  describe('Bundle Actions', () => {
    it('should handle loadBundles', () => {
      const action = BundleActions.loadBundles();
      const state = seekerReducer(initialSeekerState, action);

      expect(state.isLoadingBundles).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle createBundleSuccess', () => {
      const bundle = {
        id: '1',
        seekerId: '123',
        title: 'Test Bundle',
        referenceIds: ['ref1', 'ref2'],
        references: [],
        aggregatedRCS: 85,
        shareLink: 'https://example.com/bundle/1',
        hasPassword: false,
        views: 0,
        downloads: 0,
        status: BundleStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const action = BundleActions.createBundleSuccess({ bundle });
      const state = seekerReducer(initialSeekerState, action);

      expect(state.bundles).toContain(bundle);
      expect(state.isLoadingBundles).toBe(false);
    });

    it('should handle deleteBundleSuccess', () => {
      const bundle = {
        id: '1',
        seekerId: '123',
        title: 'Test Bundle',
        referenceIds: ['ref1'],
        references: [],
        aggregatedRCS: 85,
        shareLink: 'https://example.com/bundle/1',
        hasPassword: false,
        views: 0,
        downloads: 0,
        status: BundleStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const stateWithBundle = {
        ...initialSeekerState,
        bundles: [bundle],
        selectedBundle: bundle,
      };

      const action = BundleActions.deleteBundleSuccess({ bundleId: '1' });
      const state = seekerReducer(stateWithBundle, action);

      expect(state.bundles.length).toBe(0);
      expect(state.selectedBundle).toBe(null);
    });
  });

  describe('UI Actions', () => {
    it('should handle clearError', () => {
      const stateWithError = {
        ...initialSeekerState,
        error: 'Some error',
      };

      const action = SeekerUIActions.clearError();
      const state = seekerReducer(stateWithError, action);

      expect(state.error).toBe(null);
    });

    it('should handle resetState', () => {
      const modifiedState = {
        ...initialSeekerState,
        references: [
          {
            id: '1',
            requestId: '1',
            seekerId: '123',
            referrerId: '456',
            referrerName: 'John',
            referrerEmail: 'john@example.com',
            company: 'Acme',
            role: 'Manager',
            format: ReferenceFormat.VIDEO,
            rcsScore: 90,
            status: ReferenceRequestStatus.COMPLETED,
            isVerified: true,
            responses: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        error: 'Some error',
      };

      const action = SeekerUIActions.resetState();
      const state = seekerReducer(modifiedState, action);

      expect(state).toEqual(initialSeekerState);
    });
  });
});
