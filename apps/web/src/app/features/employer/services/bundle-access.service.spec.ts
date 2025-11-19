/**
 * Bundle Access Service Unit Tests
 *
 * Tests bundle access authentication, session management, and password validation.
 */

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { BundleAccessService } from './bundle-access.service';
import {
  BundleAccessRequest,
  BundleAccessResponse,
  BundleAccessSession,
  BundleAccessType,
} from '../models/employer.models';

describe('BundleAccessService', () => {
  let service: BundleAccessService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BundleAccessService],
    });

    service = TestBed.inject(BundleAccessService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear storage before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('requestAccess', () => {
    it('should send bundle access request', () => {
      const request: BundleAccessRequest = {
        bundleId: 'test123',
        password: 'test-password',
        viewerEmail: 'viewer@test.com',
      };

      const mockResponse: BundleAccessResponse = {
        success: true,
        session: {
          bundleId: 'test123',
          accessType: BundleAccessType.GUEST,
          sessionId: 'session123',
          expiresAt: Date.now() + 86400000,
          viewerEmail: 'viewer@test.com',
        },
        bundle: {} as any,
      };

      service.requestAccess(request).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
        expect(response.session.bundleId).toBe('test123');
      });

      const req = httpMock.expectOne('/api/v1/bundles/access');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });
  });

  describe('extractBundleIdFromLink', () => {
    it('should extract bundle ID from full URL', () => {
      const link = 'https://deepref.com/b/abc123';
      const bundleId = service.extractBundleIdFromLink(link);
      expect(bundleId).toBe('abc123');
    });

    it('should extract bundle ID from bundles URL', () => {
      const link = 'https://deepref.com/bundles/xyz789';
      const bundleId = service.extractBundleIdFromLink(link);
      expect(bundleId).toBe('xyz789');
    });

    it('should accept direct bundle ID', () => {
      const link = 'directId123';
      const bundleId = service.extractBundleIdFromLink(link);
      expect(bundleId).toBe('directId123');
    });

    it('should return null for invalid link', () => {
      const link = 'https://invalid.com/wrong/path';
      const bundleId = service.extractBundleIdFromLink(link);
      expect(bundleId).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should save session to storage', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
        viewerEmail: 'viewer@test.com',
      };

      service.saveSession(session);

      const saved = sessionStorage.getItem('deepref_bundle_session');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved!)).toEqual(session);
    });

    it('should load session from storage', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
        viewerEmail: 'viewer@test.com',
      };

      service.saveSession(session);
      const loaded = service.loadSession();

      expect(loaded).toEqual(session);
    });

    it('should return null for expired session', () => {
      const expiredSession: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      service.saveSession(expiredSession);
      const loaded = service.loadSession();

      expect(loaded).toBeNull();
    });

    it('should clear session from storage', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
      };

      service.saveSession(session);
      service.clearSession();

      const loaded = sessionStorage.getItem('deepref_bundle_session');
      expect(loaded).toBeNull();
    });

    it('should check if session is valid', () => {
      const validSession: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
      };

      service.saveSession(validSession);
      expect(service.isSessionValid()).toBe(true);
    });

    it('should return false for invalid session', () => {
      expect(service.isSessionValid()).toBe(false);
    });

    it('should extend session expiration', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 3600000, // 1 hour
      };

      const extendedSession = service.extendSession(session, 24);
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;

      expect(extendedSession.expiresAt).toBeGreaterThan(session.expiresAt);
      expect(extendedSession.expiresAt).toBeCloseTo(expectedExpiry, -3); // Within 1 second
    });
  });

  describe('Validation', () => {
    it('should validate correct bundle ID format', () => {
      expect(service.isValidBundleId('abc12345')).toBe(true);
      expect(service.isValidBundleId('test-bundle_123')).toBe(true);
    });

    it('should reject invalid bundle ID format', () => {
      expect(service.isValidBundleId('abc')).toBe(false); // Too short
      expect(service.isValidBundleId('abc@123')).toBe(false); // Invalid characters
      expect(service.isValidBundleId('')).toBe(false); // Empty
    });
  });

  describe('Viewer Email Management', () => {
    it('should save viewer email to localStorage', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
        viewerEmail: 'viewer@test.com',
      };

      service.saveSession(session);
      const savedEmail = localStorage.getItem('deepref_viewer_email');
      expect(savedEmail).toBe('viewer@test.com');
    });

    it('should get saved viewer email', () => {
      localStorage.setItem('deepref_viewer_email', 'saved@test.com');
      const email = service.getSavedViewerEmail();
      expect(email).toBe('saved@test.com');
    });

    it('should clear saved viewer email', () => {
      localStorage.setItem('deepref_viewer_email', 'saved@test.com');
      service.clearSavedViewerEmail();
      const email = localStorage.getItem('deepref_viewer_email');
      expect(email).toBeNull();
    });
  });

  describe('Time Remaining', () => {
    it('should calculate time remaining correctly', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      const remaining = service.getTimeRemaining(session);
      expect(remaining).toBeGreaterThan(3500); // ~3600 seconds
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for expired session', () => {
      const session: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() - 1000,
      };

      const remaining = service.getTimeRemaining(session);
      expect(remaining).toBe(0);
    });

    it('should format time remaining as human readable', () => {
      const session1h: BundleAccessSession = {
        bundleId: 'test123',
        accessType: BundleAccessType.GUEST,
        sessionId: 'session123',
        expiresAt: Date.now() + 3660000, // 1h 1m
      };

      const formatted = service.formatTimeRemaining(session1h);
      expect(formatted).toMatch(/1h/);
    });
  });
});
