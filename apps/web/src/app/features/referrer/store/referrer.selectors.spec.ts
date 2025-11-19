/**
 * Referrer Selectors Tests
 */

import {
  selectReferrerState,
  selectAllRequests,
  selectPendingRequests,
  selectAcceptedRequests,
  selectSelectedRequest,
  selectCompletedReferences,
  selectStatistics,
  selectNotifications,
  selectUnreadCount,
  selectUnreadNotifications,
  selectIsLoading,
  selectIsSubmitting,
  selectError,
  selectHasPendingRequests,
} from './referrer.selectors';
import { ReferrerState, ReferenceRequest } from '../models/referrer.models';

describe('Referrer Selectors', () => {
  const mockRequest1: ReferenceRequest = {
    id: '1',
    seekerId: 'seeker1',
    seeker: {
      id: 'seeker1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    status: 'pending',
    questions: [],
    allowedFormats: ['video', 'audio'],
    allowEmployerReachback: true,
    requestedAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-31'),
  };

  const mockRequest2: ReferenceRequest = {
    id: '2',
    seekerId: 'seeker2',
    seeker: {
      id: 'seeker2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
    status: 'accepted',
    questions: [],
    allowedFormats: ['text'],
    allowEmployerReachback: false,
    requestedAt: new Date('2024-01-02'),
    expiresAt: new Date('2024-02-01'),
  };

  const mockState: { referrer: ReferrerState } = {
    referrer: {
      requests: [mockRequest1, mockRequest2],
      selectedRequest: mockRequest1,
      completedReferences: [
        {
          id: 'comp1',
          referenceRequestId: 'req1',
          seekerId: 'seeker1',
          seeker: mockRequest1.seeker,
          format: 'video',
          rcsScore: 85,
          authenticityScore: 92,
          submittedAt: new Date('2024-01-15'),
          viewCount: 5,
        },
      ],
      draftResponses: new Map(),
      stats: {
        totalRequests: 10,
        pendingRequests: 3,
        completedReferences: 7,
        averageRcsScore: 85,
        responseRate: 0.7,
      },
      notifications: [
        {
          id: 'notif1',
          type: 'new_request',
          title: 'New Request',
          message: 'You have a new reference request',
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'notif2',
          type: 'reminder',
          title: 'Reminder',
          message: 'Respond to pending request',
          read: true,
          createdAt: new Date(),
        },
      ],
      unreadCount: 1,
      uploads: new Map(),
      isLoading: false,
      isSubmitting: false,
      error: null,
    },
  };

  describe('selectReferrerState', () => {
    it('should select the referrer state', () => {
      const result = selectReferrerState(mockState);
      expect(result).toBe(mockState.referrer);
    });
  });

  describe('selectAllRequests', () => {
    it('should select all requests', () => {
      const result = selectAllRequests(mockState);
      expect(result).toEqual([mockRequest1, mockRequest2]);
      expect(result.length).toBe(2);
    });
  });

  describe('selectPendingRequests', () => {
    it('should select only pending requests', () => {
      const result = selectPendingRequests(mockState);
      expect(result).toEqual([mockRequest1]);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('selectAcceptedRequests', () => {
    it('should select only accepted requests', () => {
      const result = selectAcceptedRequests(mockState);
      expect(result).toEqual([mockRequest2]);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('accepted');
    });
  });

  describe('selectSelectedRequest', () => {
    it('should select the selected request', () => {
      const result = selectSelectedRequest(mockState);
      expect(result).toEqual(mockRequest1);
    });

    it('should return null when no request is selected', () => {
      const emptyState = {
        referrer: {
          ...mockState.referrer,
          selectedRequest: null,
        },
      };
      const result = selectSelectedRequest(emptyState);
      expect(result).toBeNull();
    });
  });

  describe('selectCompletedReferences', () => {
    it('should select completed references', () => {
      const result = selectCompletedReferences(mockState);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('comp1');
    });
  });

  describe('selectStatistics', () => {
    it('should select statistics', () => {
      const result = selectStatistics(mockState);
      expect(result).toEqual(mockState.referrer.stats);
      expect(result?.totalRequests).toBe(10);
    });
  });

  describe('selectNotifications', () => {
    it('should select all notifications', () => {
      const result = selectNotifications(mockState);
      expect(result.length).toBe(2);
    });
  });

  describe('selectUnreadCount', () => {
    it('should select unread count', () => {
      const result = selectUnreadCount(mockState);
      expect(result).toBe(1);
    });
  });

  describe('selectUnreadNotifications', () => {
    it('should select only unread notifications', () => {
      const result = selectUnreadNotifications(mockState);
      expect(result.length).toBe(1);
      expect(result[0].read).toBe(false);
    });
  });

  describe('selectIsLoading', () => {
    it('should select isLoading', () => {
      const result = selectIsLoading(mockState);
      expect(result).toBe(false);
    });
  });

  describe('selectIsSubmitting', () => {
    it('should select isSubmitting', () => {
      const result = selectIsSubmitting(mockState);
      expect(result).toBe(false);
    });
  });

  describe('selectError', () => {
    it('should select error', () => {
      const result = selectError(mockState);
      expect(result).toBeNull();
    });

    it('should return error message when present', () => {
      const errorState = {
        referrer: {
          ...mockState.referrer,
          error: 'Test error',
        },
      };
      const result = selectError(errorState);
      expect(result).toBe('Test error');
    });
  });

  describe('selectHasPendingRequests', () => {
    it('should return true when there are pending requests', () => {
      const result = selectHasPendingRequests(mockState);
      expect(result).toBe(true);
    });

    it('should return false when there are no pending requests', () => {
      const noPendingState = {
        referrer: {
          ...mockState.referrer,
          requests: [mockRequest2], // Only accepted request
        },
      };
      const result = selectHasPendingRequests(noPendingState);
      expect(result).toBe(false);
    });
  });
});
