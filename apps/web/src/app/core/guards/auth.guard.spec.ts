import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { authGuard, adminGuard, verifiedUserGuard, kycGuard } from './auth.guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { lastValueFrom } from 'rxjs';

describe('AuthGuard', () => {
  let store: MockStore;
  let router: Router;
  let guard: ReturnType<typeof authGuard>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/protected' } as RouterStateSnapshot;

  const initialState = {
    auth: {
      isAuthenticated: false,
      user: null,
      token: null
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        {
          provide: Router,
          useValue: {
            createUrlTree: jest.fn((path) => path)
          }
        }
      ]
    });

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);

    // Clear session storage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Basic Authentication', () => {
    it('should redirect unauthenticated users to signin', async () => {
      guard = TestBed.runInInjectionContext(() => authGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/signin']);
      expect(sessionStorage.getItem('returnUrl')).toBe('/protected');
    });

    it('should allow authenticated users', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'test@example.com',
            role: 'seeker',
            emailVerified: true,
            kycCompleted: false
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() => authGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(sessionStorage.getItem('lastActivity')).toBeTruthy();
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(() => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'test@example.com',
            role: 'seeker',
            emailVerified: true,
            kycCompleted: false
          },
          token: 'valid-token'
        }
      });
    });

    it('should allow users with required role', async () => {
      guard = TestBed.runInInjectionContext(() =>
        authGuard({ requireRoles: ['seeker'] })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
    });

    it('should deny users without required role', async () => {
      guard = TestBed.runInInjectionContext(() =>
        authGuard({ requireRoles: ['admin'] })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/unauthorized']);
    });

    it('should handle multiple role requirements', async () => {
      guard = TestBed.runInInjectionContext(() =>
        authGuard({ requireRoles: ['admin', 'seeker'] })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
    });
  });

  describe('Email Verification', () => {
    it('should redirect unverified users to verification page', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'test@example.com',
            role: 'seeker',
            emailVerified: false,
            kycCompleted: false
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() =>
        authGuard({ requireEmailVerified: true })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/verify-email']);
    });
  });

  describe('KYC Requirements', () => {
    it('should redirect users without KYC to KYC page', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'test@example.com',
            role: 'seeker',
            emailVerified: true,
            kycCompleted: false
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() =>
        authGuard({ requireKyc: true })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/kyc']);
    });
  });

  describe('Session Timeout', () => {
    beforeEach(() => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'test@example.com',
            role: 'seeker',
            emailVerified: true,
            kycCompleted: false
          },
          token: 'valid-token'
        }
      });
    });

    it('should allow access within session timeout', async () => {
      sessionStorage.setItem('lastActivity', Date.now().toString());

      guard = TestBed.runInInjectionContext(() => authGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
    });

    it('should redirect on session timeout', async () => {
      const expiredTime = Date.now() - (16 * 60 * 1000); // 16 minutes ago
      sessionStorage.setItem('lastActivity', expiredTime.toString());

      guard = TestBed.runInInjectionContext(() => authGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/signin']);
      expect(sessionStorage.getItem('sessionExpired')).toBe('true');
    });

    it('should update last activity time on successful access', async () => {
      const beforeTime = Date.now();

      guard = TestBed.runInInjectionContext(() => authGuard());
      await lastValueFrom(guard(mockRoute, mockState));

      const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0', 10);

      expect(lastActivity).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('Convenience Guards', () => {
    describe('adminGuard', () => {
      it('should require admin role and email verification', async () => {
        store.setState({
          auth: {
            isAuthenticated: true,
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'seeker',
              emailVerified: true,
              kycCompleted: false
            },
            token: 'valid-token'
          }
        });

        const adminGuardFn = TestBed.runInInjectionContext(() => adminGuard);
        const result = await lastValueFrom(adminGuardFn(mockRoute, mockState));

        expect(result).toEqual(['/unauthorized']);
      });

      it('should allow admin users', async () => {
        store.setState({
          auth: {
            isAuthenticated: true,
            user: {
              id: '1',
              email: 'admin@example.com',
              role: 'admin',
              emailVerified: true,
              kycCompleted: false
            },
            token: 'valid-token'
          }
        });

        const adminGuardFn = TestBed.runInInjectionContext(() => adminGuard);
        const result = await lastValueFrom(adminGuardFn(mockRoute, mockState));

        expect(result).toBe(true);
      });
    });

    describe('verifiedUserGuard', () => {
      it('should require email verification', async () => {
        store.setState({
          auth: {
            isAuthenticated: true,
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'seeker',
              emailVerified: false,
              kycCompleted: false
            },
            token: 'valid-token'
          }
        });

        const verifiedGuardFn = TestBed.runInInjectionContext(() => verifiedUserGuard);
        const result = await lastValueFrom(verifiedGuardFn(mockRoute, mockState));

        expect(result).toEqual(['/auth/verify-email']);
      });
    });

    describe('kycGuard', () => {
      it('should require KYC completion', async () => {
        store.setState({
          auth: {
            isAuthenticated: true,
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'seeker',
              emailVerified: true,
              kycCompleted: false
            },
            token: 'valid-token'
          }
        });

        const kycGuardFn = TestBed.runInInjectionContext(() => kycGuard);
        const result = await lastValueFrom(kycGuardFn(mockRoute, mockState));

        expect(result).toEqual(['/auth/kyc']);
      });
    });
  });
});