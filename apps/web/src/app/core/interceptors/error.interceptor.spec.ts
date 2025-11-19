import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ErrorInterceptor } from './error.interceptor';

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let router: Router;
  let snackBar: MatSnackBar;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ErrorInterceptor,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorInterceptor,
          multi: true
        },
        provideMockStore(),
        {
          provide: Router,
          useValue: {
            navigate: jest.fn(),
            url: '/current-route'
          }
        },
        {
          provide: MatSnackBar,
          useValue: {
            open: jest.fn()
          }
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    snackBar = TestBed.inject(MatSnackBar);
    store = TestBed.inject(MockStore);

    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', (done) => {
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid request. Please check your input.');
          expect(snackBar.open).toHaveBeenCalledWith(
            'Invalid request. Please check your input.',
            'Dismiss',
            expect.any(Object)
          );
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush({ error: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 401 Unauthorized', (done) => {
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(router.navigate).toHaveBeenCalledWith(
            ['/auth/signin'],
            { queryParams: { sessionExpired: true } }
          );
          expect(sessionStorage.getItem('lastError')).toBe('401');
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should not redirect on 401 for auth endpoints', (done) => {
      httpClient.post('/api/v1/auth/signin', {}).subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(router.navigate).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/auth/signin');
      req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 Forbidden', (done) => {
      httpClient.get('/api/v1/admin/users').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/admin/users');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 Not Found', (done) => {
      httpClient.get('/api/v1/users/999').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('The requested resource was not found.');
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/999');
      req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 429 Rate Limit', (done) => {
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(snackBar.open).toHaveBeenCalledWith(
            expect.stringContaining('Rate limit exceeded'),
            'Dismiss',
            expect.any(Object)
          );
          expect(sessionStorage.getItem('rateLimitedUntil')).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush(
        { error: 'Too Many Requests' },
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: new HttpHeaders({ 'Retry-After': '60' })
        }
      );
    });

    it('should handle 500 Internal Server Error', (done) => {
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Server error. Please try again later.');

          const serverErrors = JSON.parse(sessionStorage.getItem('serverErrors') || '[]');
          expect(serverErrors.length).toBe(1);
          expect(serverErrors[0].status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Custom Error Messages', () => {
    it('should use server-provided error message', (done) => {
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Custom error from server');
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.flush({ message: 'Custom error from server' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle validation errors array', (done) => {
      httpClient.post('/api/v1/users/create', {}).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Email is required, Password is too short');
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/create');
      req.flush(
        { errors: ['Email is required', 'Password is too short'] },
        { status: 422, statusText: 'Unprocessable Entity' }
      );
    });

    it('should handle validation errors object', (done) => {
      httpClient.post('/api/v1/users/create', {}).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid email');
          expect(error.message).toContain('Too short');
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/create');
      req.flush(
        {
          errors: {
            email: ['Invalid email'],
            password: ['Too short']
          }
        },
        { status: 422, statusText: 'Unprocessable Entity' }
      );
    });

    it('should handle network errors', (done) => {
      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Network error. Please check your connection.');
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done(),
        error: () => done.fail('Should have succeeded after retry')
      });

      // First attempt fails
      setTimeout(() => {
        const req1 = httpMock.expectOne('/api/v1/users/profile');
        attemptCount++;
        req1.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

        // Second attempt (retry) succeeds
        setTimeout(() => {
          const req2 = httpMock.expectOne('/api/v1/users/profile');
          attemptCount++;
          expect(attemptCount).toBe(2);
          req2.flush({ data: 'success' });
        }, 1100);
      }, 0);
    });

    it('should not retry on 400 errors', (done) => {
      let attemptCount = 0;

      httpClient.get('/api/v1/users/profile').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(attemptCount).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/users/profile');
      attemptCount++;
      req.flush({ error: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

      // Verify no retry request
      setTimeout(() => {
        httpMock.verify();
      }, 2000);
    });

    it('should not retry auth requests', (done) => {
      let attemptCount = 0;

      httpClient.post('/api/v1/auth/signin', {}).subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(attemptCount).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/auth/signin');
      attemptCount++;
      req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

      // Verify no retry request
      setTimeout(() => {
        httpMock.verify();
      }, 2000);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', (done) => {
      const requests: Promise<void>[] = [];

      // Make 5 failing requests (threshold)
      for (let i = 0; i < 5; i++) {
        const promise = new Promise<void>((resolve) => {
          httpClient.get('/api/v1/users/profile').subscribe({
            next: () => resolve(),
            error: () => resolve()
          });
        });
        requests.push(promise);
      }

      // Answer all requests with 500 errors
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          const req = httpMock.expectOne('/api/v1/users/profile');
          req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });
        }

        // Wait for all requests to complete
        Promise.all(requests).then(() => {
          // Now try another request - should fail immediately
          httpClient.get('/api/v1/users/profile').subscribe({
            next: () => done.fail('Should have failed'),
            error: (error) => {
              expect(error.message).toContain('Circuit breaker is open');
              done();
            }
          });
        });
      }, 0);
    });
  });

  describe('Security Error Logging', () => {
    it('should log security errors', (done) => {
      const consoleSpy = jest.spyOn(console, 'error');

      httpClient.get('/api/v1/admin/users').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Security Error Log:',
            expect.objectContaining({
              type: 'SECURITY_ERROR',
              status: 403,
              url: '/api/v1/admin/users'
            })
          );

          const securityLogs = JSON.parse(sessionStorage.getItem('securityLogs') || '[]');
          expect(securityLogs.length).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne('/api/v1/admin/users');
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Server Error Tracking', () => {
    it('should track multiple server errors and show outage message', (done) => {
      const promises: Promise<void>[] = [];

      // Make 3 failing requests within a minute
      for (let i = 0; i < 3; i++) {
        const promise = new Promise<void>((resolve) => {
          httpClient.get('/api/v1/users/profile').subscribe({
            next: () => resolve(),
            error: () => resolve()
          });
        });
        promises.push(promise);
      }

      // Answer all requests with 500 errors
      setTimeout(() => {
        for (let i = 0; i < 3; i++) {
          const req = httpMock.expectOne('/api/v1/users/profile');
          req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });
        }

        Promise.all(promises).then(() => {
          expect(snackBar.open).toHaveBeenCalledWith(
            'We are experiencing technical difficulties. Please try again later.',
            'Dismiss',
            expect.any(Object)
          );
          done();
        });
      }, 0);
    });
  });
});