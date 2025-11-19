/**
 * Referrer Reducer Tests
 */

import { referrerReducer, initialReferrerState } from './referrer.reducer';
import { ReferrerActions } from './referrer.actions';
import { ReferenceRequest, CompletedReference, ReferrerStats } from '../models/referrer.models';

describe('ReferrerReducer', () => {
  describe('unknown action', () => {
    it('should return the initial state', () => {
      const action = {} as any;
      const result = referrerReducer(initialReferrerState, action);

      expect(result).toBe(initialReferrerState);
    });
  });

  describe('loadRequests', () => {
    it('should set isLoading to true', () => {
      const action = ReferrerActions.loadRequests();
      const result = referrerReducer(initialReferrerState, action);

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('loadRequestsSuccess', () => {
    it('should set requests and isLoading to false', () => {
      const requests: ReferenceRequest[] = [
        {
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
          allowedFormats: ['video', 'audio', 'text'],
          allowEmployerReachback: true,
          requestedAt: new Date(),
          expiresAt: new Date(),
        },
      ];

      const action = ReferrerActions.loadRequestsSuccess({ requests });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.requests).toEqual(requests);
      expect(result.isLoading).toBe(false);
    });
  });

  describe('loadRequestsFailure', () => {
    it('should set error and isLoading to false', () => {
      const error = 'Failed to load requests';
      const action = ReferrerActions.loadRequestsFailure({ error });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.error).toEqual(error);
      expect(result.isLoading).toBe(false);
    });
  });

  describe('acceptRequest', () => {
    it('should set isLoading to true', () => {
      const action = ReferrerActions.acceptRequest({ requestId: '1' });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('acceptRequestSuccess', () => {
    it('should update the request in the list and set selectedRequest', () => {
      const initialRequest: ReferenceRequest = {
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
        allowedFormats: ['video'],
        allowEmployerReachback: true,
        requestedAt: new Date(),
        expiresAt: new Date(),
      };

      const state = {
        ...initialReferrerState,
        requests: [initialRequest],
      };

      const acceptedRequest: ReferenceRequest = {
        ...initialRequest,
        status: 'accepted',
      };

      const action = ReferrerActions.acceptRequestSuccess({ request: acceptedRequest });
      const result = referrerReducer(state, action);

      expect(result.selectedRequest).toEqual(acceptedRequest);
      expect(result.requests[0].status).toEqual('accepted');
      expect(result.isLoading).toBe(false);
    });
  });

  describe('submitResponse', () => {
    it('should set isSubmitting to true', () => {
      const action = ReferrerActions.submitResponse({
        payload: {
          referenceRequestId: '1',
          format: 'video',
          responses: [],
        },
      });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.isSubmitting).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('submitResponseSuccess', () => {
    it('should clear draft and set isSubmitting to false', () => {
      const state = {
        ...initialReferrerState,
        draftResponses: new Map([
          [
            'ref1',
            {
              id: 'draft1',
              referenceRequestId: 'ref1',
              format: 'video' as const,
              responses: [],
              attachments: [],
              isDraft: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        ]),
      };

      const action = ReferrerActions.submitResponseSuccess({
        response: {
          referenceId: 'ref1',
          rcsScore: 85,
          authenticityScore: 92,
        },
      });

      const result = referrerReducer(state, action);

      expect(result.draftResponses.has('ref1')).toBe(false);
      expect(result.isSubmitting).toBe(false);
    });
  });

  describe('saveDraftSuccess', () => {
    it('should add draft to draftResponses map', () => {
      const draft = {
        id: 'draft1',
        referenceRequestId: 'ref1',
        format: 'text' as const,
        responses: [],
        attachments: [],
        isDraft: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = ReferrerActions.saveDraftSuccess({ draft });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.draftResponses.has('ref1')).toBe(true);
      expect(result.draftResponses.get('ref1')).toEqual(draft);
    });
  });

  describe('uploadMediaProgress', () => {
    it('should update upload progress in map', () => {
      const progress = {
        fileId: 'file1',
        fileName: 'video.mp4',
        progress: 50,
        status: 'uploading' as const,
      };

      const action = ReferrerActions.uploadMediaProgress({ progress });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.uploads.has('file1')).toBe(true);
      expect(result.uploads.get('file1')?.progress).toBe(50);
    });
  });

  describe('loadStatisticsSuccess', () => {
    it('should set stats and isLoading to false', () => {
      const stats: ReferrerStats = {
        totalRequests: 10,
        pendingRequests: 3,
        completedReferences: 7,
        averageRcsScore: 85,
        responseRate: 0.7,
      };

      const action = ReferrerActions.loadStatisticsSuccess({ stats });
      const result = referrerReducer(initialReferrerState, action);

      expect(result.stats).toEqual(stats);
      expect(result.isLoading).toBe(false);
    });
  });

  describe('markNotificationReadSuccess', () => {
    it('should mark notification as read and update unread count', () => {
      const state = {
        ...initialReferrerState,
        notifications: [
          {
            id: 'notif1',
            type: 'new_request' as const,
            title: 'New Request',
            message: 'You have a new reference request',
            read: false,
            createdAt: new Date(),
          },
          {
            id: 'notif2',
            type: 'reminder' as const,
            title: 'Reminder',
            message: 'Respond to pending request',
            read: false,
            createdAt: new Date(),
          },
        ],
        unreadCount: 2,
      };

      const action = ReferrerActions.markNotificationReadSuccess({ notificationId: 'notif1' });
      const result = referrerReducer(state, action);

      expect(result.notifications[0].read).toBe(true);
      expect(result.unreadCount).toBe(1);
    });
  });

  describe('clearError', () => {
    it('should clear the error', () => {
      const state = {
        ...initialReferrerState,
        error: 'Some error',
      };

      const action = ReferrerActions.clearError();
      const result = referrerReducer(state, action);

      expect(result.error).toBeNull();
    });
  });

  describe('clearSelectedRequest', () => {
    it('should clear the selected request', () => {
      const request: ReferenceRequest = {
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
        allowedFormats: ['video'],
        allowEmployerReachback: true,
        requestedAt: new Date(),
        expiresAt: new Date(),
      };

      const state = {
        ...initialReferrerState,
        selectedRequest: request,
      };

      const action = ReferrerActions.clearSelectedRequest();
      const result = referrerReducer(state, action);

      expect(result.selectedRequest).toBeNull();
    });
  });
});
