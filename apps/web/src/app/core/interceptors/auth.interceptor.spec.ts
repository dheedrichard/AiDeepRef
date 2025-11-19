import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../../features/auth/services/auth.service';
import { of, throwError } from 'rxjs';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let store: MockStore;
  let router: Router;
  let authService: AuthService;

  const initialState = {
    auth: {
      isAuthenticated: true,
      token: 'test-token',
      refreshToken: 'refresh-token',
      user: null
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthInterceptor,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        },
        provideMockStore({ initialState }),
        {
          provide: Router,
          useValue: {
            navigate: jest.fn()
          }
        },
        {
          provide: AuthService,
          useValue: {
            refreshToken: jest.fn()
          }
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);

    // Clear session storage
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Token Attachment', () => {
    it('should add Authorization header to protected requests', () => {
      httpClient.get('/api/v1/users/profile').subscribe();

      const req = httpMock.expectOne('/api/v1/users/profile');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({});
    });

    it('should not add Authorization header to whitelisted URLs', () => {
      httpClient.post('/api/v1/auth/signin', { email: 'test@example.com', password: 'password' }).subscribe();

      const req = httpMock.expectOne('/api/v1/auth/signin');
      expect(req.request.headers.has('Authorization')).toBeFalsy();
      req.flush({});
    });

    it('should not add Authorization header when no token exists', () => {
      store.setState({
        auth: {
          isAuthenticated: false,
          token: null,
          refreshToken: null,
          user: null
        }
      });

      httpClient.get('/api/v1/users/profile').subscribe();

      const req = httpMock.expectOne('/api/v1/users/profile');
      expect(req.request.headers.has('Authorization')).toBeFalsy();
      req.flush({});
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to all requests', () => {
      httpClient.get('/api/v1/users/profile').subscribe();

      const req = httpMock.expectOne('/api/v1/users/profile');
      expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
      expect(req.request.headers.get('X-Frame-Options')).toBe('DENY');
      expect(req.request.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(req.request.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      req.flush({});
    });
  });

  describe('CSRF Protection', () => {
    it('should add CSRF token to non-GET requests', () => {
      sessionStorage.setItem('csrfToken', 'test-csrf-token');

      httpClient.post('/api/v1/users/update', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/users/update');
      expect(req.request.headers.get('X-CSRF-Token')).toBe('test-csrf-token');
      req.flush({});
    });

    it('should not add CSRF token to GET requests', () => {
      sessionStorage.setItem('csrfToken', 'test-csrf-token');

      httpClient.get('/api/v1/users/profile').subscribe();

      const req = httpMock.expectOne('/api/v1/users/profile');
      expect(req.request.headers.has('X-CSRF-Token')).toBeFalsy();
      req.flush({});
    });

    it('should read CSRF token from meta tag', () => {
      const meta = document.createElement('meta');
      meta.name = 'csrf-token';
      meta.content = 'meta-csrf-token';
      document.head.appendChild(meta);

      httpClient.post('/api/v1/users/update', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/users/update');
      expect(req.request.headers.get('X-CSRF-Token')).toBe('meta-csrf-token');
      req.flush({});

      document.head.removeChild(meta);
    });

    it('should read CSRF token from cookie', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'XSRF-TOKEN=cookie-csrf-token'
      });

      httpClient.post('/api/v1/users/update', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/users/update');
      expect(req.request.headers.get('X-CSRF-Token')).toBe('cookie-csrf-token');
      req.flush({});
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 errors by refreshing token', (done) => {
      const refreshResponse = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      };

      jest.spyOn(authService, 'refreshToken').mockReturnValue(of(refreshResponse));

      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done(),
        error: () => done.fail('Should have succeeded after refresh')
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

      // After refresh, expect retry
      setTimeout(() => {
        const retryReq = httpMock.expectOne('/api/v1/users/profile');
        expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
        retryReq.flush({});
      }, 100);
    });

    it('should logout on 401 when refresh fails', (done) => {
      jest.spyOn(authService, 'refreshToken').mockReturnValue(
        throwError(() => new Error('Refresh failed'))
      );

      const dispatchSpy = jest.spyOn(store, 'dispatch');

      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: expect.stringContaining('logout') })
          );
          expect(router.navigate).toHaveBeenCalledWith(['/auth/signin']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should redirect to unauthorized on 403 errors', (done) => {
      httpClient.get('/api/v1/admin/users').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/admin/users');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle rate limiting (429) errors', (done) => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.error.message).toContain('Rate limit exceeded');
          expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              type: expect.stringContaining('rateLimitExceeded'),
              retryAfter: 60
            })
          );
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush(
        { message: 'Rate limit exceeded' },
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: new HttpHeaders({ 'Retry-After': '60' })
        }
      );
    });
  });

  describe('Sensitive Operations', () => {
    it('should add request signature for sensitive operations', () => {
      httpClient.put('/api/v1/auth/change-password', { newPassword: 'newpass' }).subscribe();

      const req = httpMock.expectOne('/api/v1/auth/change-password');
      expect(req.request.headers.has('X-Request-Signature')).toBeTruthy();
      req.flush({});
    });

    it('should add signature for DELETE operations', () => {
      httpClient.delete('/api/v1/users/123').subscribe();

      const req = httpMock.expectOne('/api/v1/users/123');
      expect(req.request.headers.has('X-Request-Signature')).toBeTruthy();
      req.flush({});
    });

    it('should add signature for admin operations', () => {
      httpClient.post('/api/v1/admin/settings', {}).subscribe();

      const req = httpMock.expectOne('/api/v1/admin/settings');
      expect(req.request.headers.has('X-Request-Signature')).toBeTruthy();
      req.flush({});
    });
  });

  describe('Token Refresh Queue', () => {
    it('should queue requests during token refresh', (done) => {
      const refreshResponse = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      };

      jest.spyOn(authService, 'refreshToken').mockReturnValue(of(refreshResponse));

      let completedRequests = 0;

      // Make multiple requests that will fail with 401
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => {
          completedRequests++;
          if (completedRequests === 2) done();
        },
        error: () => done.fail('Request 1 should have succeeded')
      });

      httpClient.get('/api/v1/users/settings').subscribe({
        next: () => {
          completedRequests++;
          if (completedRequests === 2) done();
        },
        error: () => done.fail('Request 2 should have succeeded')
      });

      // Both requests fail with 401
      const req1 = httpMock.expectOne('/api/v1/users/profile');
      req1.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

      const req2 = httpMock.expectOne('/api/v1/users/settings');
      req2.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

      // After refresh, both should retry with new token
      setTimeout(() => {
        const retryReq1 = httpMock.expectOne('/api/v1/users/profile');
        expect(retryReq1.request.headers.get('Authorization')).toBe('Bearer new-token');
        retryReq1.flush({});

        const retryReq2 = httpMock.expectOne('/api/v1/users/settings');
        expect(retryReq2.request.headers.get('Authorization')).toBe('Bearer new-token');
        retryReq2.flush({});
      }, 100);
    });
  });
});