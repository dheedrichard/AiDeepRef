/**
 * Referrer API Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReferrerApiService } from './referrer-api.service';
import { environment } from '../../../../environments/environment';

describe('ReferrerApiService', () => {
  let service: ReferrerApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReferrerApiService],
    });

    service = TestBed.inject(ReferrerApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getRequests', () => {
    it('should retrieve reference requests', () => {
      const mockRequests = [
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
          allowedFormats: ['video'],
          allowEmployerReachback: true,
          requestedAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-01-31T00:00:00Z',
        },
      ];

      service.getRequests().subscribe((requests) => {
        expect(requests.length).toBe(1);
        expect(requests[0].id).toBe('1');
        expect(requests[0].requestedAt instanceof Date).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/referrer/requests`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRequests);
    });

    it('should handle errors', () => {
      service.getRequests().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/referrer/requests`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getRequest', () => {
    it('should retrieve a single reference request', () => {
      const mockRequest = {
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
        requestedAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-31T00:00:00Z',
      };

      service.getRequest('1').subscribe((request) => {
        expect(request.id).toBe('1');
        expect(request.requestedAt instanceof Date).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRequest);
    });
  });

  describe('acceptRequest', () => {
    it('should accept a reference request', () => {
      const mockRequest = {
        id: '1',
        status: 'accepted',
        seekerId: 'seeker1',
        seeker: {
          id: 'seeker1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        questions: [],
        allowedFormats: ['video'],
        allowEmployerReachback: true,
        requestedAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-31T00:00:00Z',
      };

      service.acceptRequest('1').subscribe((request) => {
        expect(request.status).toBe('accepted');
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1/accept`);
      expect(req.request.method).toBe('POST');
      req.flush(mockRequest);
    });
  });

  describe('declineRequest', () => {
    it('should decline a reference request', () => {
      service.declineRequest('1', 'Not available').subscribe((response) => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1/decline`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Not available' });
      req.flush(null);
    });

    it('should decline without reason', () => {
      service.declineRequest('1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/references/1/decline`);
      expect(req.request.body).toEqual({ reason: undefined });
      req.flush(null);
    });
  });

  describe('submitResponse', () => {
    it('should submit a reference response', () => {
      const payload = {
        referenceRequestId: '1',
        format: 'video' as const,
        responses: [
          {
            questionId: 'q1',
            answer: 'Test answer',
          },
        ],
      };

      const mockResponse = {
        referenceId: 'ref1',
        rcsScore: 85,
      };

      service.submitResponse(payload).subscribe((response) => {
        expect(response.referenceId).toBe('ref1');
        expect(response.rcsScore).toBe(85);
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1/submit`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.format).toBe('video');
      req.flush(mockResponse);
    });
  });

  describe('saveDraft', () => {
    it('should save a draft response', () => {
      const payload = {
        referenceRequestId: '1',
        format: 'text' as const,
        responses: [
          {
            questionId: 'q1',
            answer: 'Draft answer',
          },
        ],
      };

      const mockDraft = {
        id: 'draft1',
        referenceRequestId: '1',
        format: 'text',
        responses: payload.responses,
        attachments: [],
        isDraft: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      service.saveDraft(payload).subscribe((draft) => {
        expect(draft.id).toBe('draft1');
        expect(draft.isDraft).toBe(true);
        expect(draft.createdAt instanceof Date).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1/draft`);
      expect(req.request.method).toBe('POST');
      req.flush(mockDraft);
    });
  });

  describe('getDraft', () => {
    it('should retrieve a draft response', () => {
      const mockDraft = {
        id: 'draft1',
        referenceRequestId: '1',
        format: 'text',
        responses: [],
        attachments: [],
        isDraft: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      service.getDraft('1').subscribe((draft) => {
        expect(draft).toBeTruthy();
        expect(draft?.id).toBe('draft1');
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1/draft`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDraft);
    });

    it('should return null when no draft exists', () => {
      service.getDraft('1').subscribe((draft) => {
        expect(draft).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/references/1/draft`);
      req.flush(null);
    });
  });

  describe('getCompletedReferences', () => {
    it('should retrieve completed references', () => {
      const mockReferences = [
        {
          id: 'ref1',
          referenceRequestId: 'req1',
          seekerId: 'seeker1',
          seeker: {
            id: 'seeker1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          format: 'video',
          rcsScore: 85,
          authenticityScore: 92,
          submittedAt: '2024-01-15T00:00:00Z',
          viewCount: 5,
        },
      ];

      service.getCompletedReferences().subscribe((references) => {
        expect(references.length).toBe(1);
        expect(references[0].submittedAt instanceof Date).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/referrer/completed`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReferences);
    });
  });

  describe('getStatistics', () => {
    it('should retrieve referrer statistics', () => {
      const mockStats = {
        totalRequests: 10,
        pendingRequests: 3,
        completedReferences: 7,
        averageRcsScore: 85,
        responseRate: 0.7,
      };

      service.getStatistics().subscribe((stats) => {
        expect(stats.totalRequests).toBe(10);
        expect(stats.responseRate).toBe(0.7);
      });

      const req = httpMock.expectOne(`${baseUrl}/referrer/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });
  });

  describe('getNotifications', () => {
    it('should retrieve notifications', () => {
      const mockNotifications = [
        {
          id: 'notif1',
          type: 'new_request',
          title: 'New Request',
          message: 'You have a new reference request',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      service.getNotifications().subscribe((notifications) => {
        expect(notifications.length).toBe(1);
        expect(notifications[0].createdAt instanceof Date).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/referrer/notifications`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNotifications);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark a notification as read', () => {
      service.markNotificationRead('notif1').subscribe((response) => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/referrer/notifications/notif1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });
});
