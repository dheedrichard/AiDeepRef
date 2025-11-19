/**
 * Seeker API Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SeekerApiService } from './seeker-api.service';
import { environment } from '../../../../environments/environment';

describe('SeekerApiService', () => {
  let service: SeekerApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SeekerApiService],
    });
    service = TestBed.inject(SeekerApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDashboardData', () => {
    it('should fetch dashboard data', () => {
      const mockData = {
        stats: {
          totalReferences: 5,
          completedReferences: 4,
          pendingReferences: 1,
          averageRCS: 85,
          totalBundles: 2,
          activeBundles: 2,
          totalRequests: 10,
          pendingRequests: 3,
        },
        recentActivity: [],
      };

      service.getDashboardData().subscribe((data) => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/seekers/dashboard`);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });
  });

  describe('getRecentActivity', () => {
    it('should fetch recent activity', () => {
      const mockActivity = [
        {
          id: '1',
          type: 'request_sent' as const,
          title: 'Request sent',
          description: 'Sent to John Doe',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      service.getRecentActivity().subscribe((activity) => {
        expect(activity).toEqual(mockActivity);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/seekers/activity`);
      expect(req.request.method).toBe('GET');
      req.flush(mockActivity);
    });
  });

  describe('getProfile', () => {
    it('should fetch seeker profile', () => {
      const mockProfile = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        kycStatus: 'verified',
      };

      service.getProfile('123').subscribe((profile) => {
        expect(profile).toEqual(mockProfile);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/seekers/123/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProfile);
    });
  });
});
