/**
 * Auth Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import {
  SignUpRequest,
  SignUpResponse,
  SignInRequest,
  SignInResponse,
  UserRole,
  KycStatus,
} from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signUp', () => {
    it('should send POST request to signup endpoint', () => {
      const request: SignUpRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.SEEKER,
        keepMeSignedIn: true,
      };

      const response: SignUpResponse = {
        user: {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SEEKER,
          kycStatus: KycStatus.NOT_STARTED,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
        message: 'User created successfully',
      };

      service.signUp(request).subscribe((res) => {
        expect(res).toEqual(response);
      });

      const req = httpMock.expectOne('/api/v1/auth/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(response);
    });
  });

  describe('signIn', () => {
    it('should send POST request to signin endpoint', () => {
      const request: SignInRequest = {
        email: 'john@example.com',
      };

      const response: SignInResponse = {
        message: 'Magic link sent',
        magicLinkSent: true,
      };

      service.signIn(request).subscribe((res) => {
        expect(res).toEqual(response);
      });

      const req = httpMock.expectOne('/api/v1/auth/signin');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(response);
    });
  });

  describe('Storage operations', () => {
    const mockUser = {
      id: '1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.SEEKER,
      kycStatus: KycStatus.NOT_STARTED,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockToken = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000,
    };

    it('should save to localStorage when keepSignedIn is true', () => {
      service.saveToStorage(mockUser, mockToken, true);

      expect(localStorage.getItem('deepref_user')).toBeTruthy();
      expect(localStorage.getItem('deepref_token')).toBeTruthy();
    });

    it('should save to sessionStorage when keepSignedIn is false', () => {
      service.saveToStorage(mockUser, mockToken, false);

      expect(sessionStorage.getItem('deepref_user')).toBeTruthy();
      expect(sessionStorage.getItem('deepref_token')).toBeTruthy();
    });

    it('should load from localStorage', () => {
      service.saveToStorage(mockUser, mockToken, true);

      const loaded = service.loadFromStorage();
      expect(loaded).toBeTruthy();
      expect(loaded?.user.email).toBe(mockUser.email);
      expect(loaded?.token.accessToken).toBe(mockToken.accessToken);
    });

    it('should return null when no data in storage', () => {
      const loaded = service.loadFromStorage();
      expect(loaded).toBeNull();
    });

    it('should clear all storage', () => {
      service.saveToStorage(mockUser, mockToken, true);
      service.clearStorage();

      expect(localStorage.getItem('deepref_user')).toBeNull();
      expect(localStorage.getItem('deepref_token')).toBeNull();
      expect(sessionStorage.getItem('deepref_user')).toBeNull();
      expect(sessionStorage.getItem('deepref_token')).toBeNull();
    });

    it('should return null for expired token', () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: Date.now() - 3600000, // Expired 1 hour ago
      };

      service.saveToStorage(mockUser, expiredToken, true);

      const loaded = service.loadFromStorage();
      expect(loaded).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid data in storage', () => {
      const mockUser = {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.SEEKER,
        kycStatus: KycStatus.NOT_STARTED,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockToken = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      service.saveToStorage(mockUser, mockToken, true);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when no data in storage', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
