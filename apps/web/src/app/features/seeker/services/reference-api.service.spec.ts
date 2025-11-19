/**
 * Reference API Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReferenceApiService } from './reference-api.service';
import { environment } from '../../../../environments/environment';
import { ReferenceFormat, ReferenceRequestStatus } from '../models/seeker.models';

describe('ReferenceApiService', () => {
  let service: ReferenceApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReferenceApiService],
    });
    service = TestBed.inject(ReferenceApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRequests', () => {
    it('should fetch all reference requests', () => {
      const mockRequests = [
        {
          id: '1',
          seekerId: '123',
          referrerName: 'John Doe',
          referrerEmail: 'john@example.com',
          company: 'Acme Corp',
          role: 'Manager',
          questions: [],
          allowedFormats: [ReferenceFormat.VIDEO],
          allowEmployerReachback: true,
          status: ReferenceRequestStatus.SENT,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      service.getRequests().subscribe((requests) => {
        expect(requests).toEqual(mockRequests);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/requests`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRequests);
    });
  });

  describe('createRequest', () => {
    it('should create a new reference request', () => {
      const payload = {
        referrerName: 'John Doe',
        referrerEmail: 'john@example.com',
        company: 'Acme Corp',
        role: 'Manager',
        questions: [],
        allowedFormats: [ReferenceFormat.VIDEO],
        allowEmployerReachback: true,
      };

      const mockResponse = {
        id: '1',
        seekerId: '123',
        ...payload,
        status: ReferenceRequestStatus.SENT,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      service.createRequest(payload).subscribe((request) => {
        expect(request).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/requests`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('getReferences', () => {
    it('should fetch references with filters', () => {
      const filters = {
        status: [ReferenceRequestStatus.COMPLETED],
        minRCS: 80,
      };

      const mockReferences = [
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

      service.getReferences(filters).subscribe((references) => {
        expect(references).toEqual(mockReferences);
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes(`${environment.apiUrl}/references`)
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('completed');
      expect(req.request.params.get('minRCS')).toBe('80');
      req.flush(mockReferences);
    });
  });
});
