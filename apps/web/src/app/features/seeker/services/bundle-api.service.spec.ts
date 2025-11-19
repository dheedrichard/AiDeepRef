/**
 * Bundle API Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BundleApiService } from './bundle-api.service';
import { environment } from '../../../../environments/environment';
import { BundleStatus } from '../models/seeker.models';

describe('BundleApiService', () => {
  let service: BundleApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BundleApiService],
    });
    service = TestBed.inject(BundleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getBundles', () => {
    it('should fetch all bundles', () => {
      const mockBundles = [
        {
          id: '1',
          seekerId: '123',
          title: 'Test Bundle',
          referenceIds: ['ref1', 'ref2'],
          references: [],
          aggregatedRCS: 85,
          shareLink: 'https://example.com/bundle/1',
          hasPassword: false,
          views: 10,
          downloads: 5,
          status: BundleStatus.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      service.getBundles().subscribe((bundles) => {
        expect(bundles).toEqual(mockBundles);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/bundles`);
      expect(req.request.method).toBe('GET');
      req.flush(mockBundles);
    });
  });

  describe('createBundle', () => {
    it('should create a new bundle', () => {
      const payload = {
        title: 'New Bundle',
        description: 'Test description',
        referenceIds: ['ref1', 'ref2'],
      };

      const mockResponse = {
        id: '1',
        seekerId: '123',
        ...payload,
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

      service.createBundle(payload).subscribe((bundle) => {
        expect(bundle).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/bundles`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('deleteBundle', () => {
    it('should delete a bundle', () => {
      service.deleteBundle('1').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/bundles/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getBundleAnalytics', () => {
    it('should fetch bundle analytics', () => {
      const mockAnalytics = {
        bundleId: '1',
        views: 100,
        downloads: 50,
        viewHistory: [],
        downloadHistory: [],
      };

      service.getBundleAnalytics('1').subscribe((analytics) => {
        expect(analytics).toEqual(mockAnalytics);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/bundles/1/analytics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAnalytics);
    });
  });
});
