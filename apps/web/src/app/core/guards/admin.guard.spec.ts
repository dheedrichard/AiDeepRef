import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { adminGuard, superAdminGuard, systemAdminGuard } from './admin.guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { lastValueFrom, of } from 'rxjs';

describe('AdminGuard', () => {
  let store: MockStore;
  let router: Router;
  let httpClient: HttpClient;
  let guard: ReturnType<typeof adminGuard>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/admin/dashboard' } as RouterStateSnapshot;

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
        },
        {
          provide: HttpClient,
          useValue: {
            post: jest.fn(() => of({}))
          }
        }
      ]
    });

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    httpClient = TestBed.inject(HttpClient);

    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Basic Admin Access', () => {
    it('should redirect unauthenticated users to signin', async () => {
      guard = TestBed.runInInjectionContext(() => adminGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/signin']);
      expect(sessionStorage.getItem('returnUrl')).toBe('/admin/dashboard');
      expect(sessionStorage.getItem('adminAttempt')).toBe('true');
    });

    it('should deny non-admin users', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'user@example.com',
            role: 'seeker',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() => adminGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/unauthorized']);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/v1/audit/log',
        expect.objectContaining({
          event: 'ADMIN_ACCESS_DENIED',
          userId: '1',
          email: 'user@example.com',
          role: 'seeker',
          attemptedUrl: '/admin/dashboard'
        })
      );
    });

    it('should allow admin users', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() => adminGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/v1/audit/log',
        expect.objectContaining({
          event: 'ADMIN_ACCESS_GRANTED',
          userId: '1',
          email: 'admin@example.com',
          accessedUrl: '/admin/dashboard'
        })
      );
    });
  });

  describe('Email Verification', () => {
    it('should redirect unverified admin to verification page', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: false
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() => adminGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/verify-email']);
    });
  });

  describe('Two-Factor Authentication', () => {
    beforeEach(() => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true,
            twoFactorEnabled: false
          },
          token: 'valid-token'
        }
      });
    });

    it('should redirect to 2FA setup if required but not enabled', async () => {
      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ requireTwoFactor: true })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/setup-2fa']);
    });

    it('should redirect to 2FA verification if not verified', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true,
            twoFactorEnabled: true
          },
          token: 'valid-token'
        }
      });

      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ requireTwoFactor: true })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/verify-2fa']);
    });

    it('should allow access with verified 2FA', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true,
            twoFactorEnabled: true
          },
          token: 'valid-token'
        }
      });

      sessionStorage.setItem('twoFactorVerified', 'true');

      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ requireTwoFactor: true })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
    });
  });

  describe('IP Whitelisting', () => {
    beforeEach(() => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });
    });

    it('should block access from non-whitelisted IPs', async () => {
      sessionStorage.setItem('userIP', '192.168.1.100');

      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ allowedIPs: ['10.0.0.1', '10.0.0.2'] })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/unauthorized']);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/v1/audit/log',
        expect.objectContaining({
          event: 'ADMIN_IP_BLOCKED',
          ip: '192.168.1.100'
        })
      );
    });

    it('should allow access from whitelisted IPs', async () => {
      sessionStorage.setItem('userIP', '10.0.0.1');

      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ allowedIPs: ['10.0.0.1', '10.0.0.2'] })
      );

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
    });
  });

  describe('Admin Session Timeout', () => {
    beforeEach(() => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });
    });

    it('should allow access within admin timeout (10 minutes)', async () => {
      sessionStorage.setItem('lastActivity', Date.now().toString());

      guard = TestBed.runInInjectionContext(() => adminGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(sessionStorage.getItem('lastAdminActivity')).toBeTruthy();
    });

    it('should redirect on admin session timeout', async () => {
      const expiredTime = Date.now() - (11 * 60 * 1000); // 11 minutes ago
      sessionStorage.setItem('lastActivity', expiredTime.toString());

      guard = TestBed.runInInjectionContext(() => adminGuard());

      const result = await lastValueFrom(guard(mockRoute, mockState));

      expect(result).toEqual(['/auth/signin']);
      expect(sessionStorage.getItem('adminSessionExpired')).toBe('true');
    });
  });

  describe('Logging Configuration', () => {
    beforeEach(() => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });
    });

    it('should not log access when disabled', async () => {
      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ logAccess: false })
      );

      await lastValueFrom(guard(mockRoute, mockState));

      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('should log access when enabled', async () => {
      guard = TestBed.runInInjectionContext(() =>
        adminGuard({ logAccess: true })
      );

      await lastValueFrom(guard(mockRoute, mockState));

      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/v1/audit/log',
        expect.objectContaining({
          event: 'ADMIN_ACCESS_GRANTED'
        })
      );
    });
  });

  describe('Super Admin Guard', () => {
    it('should deny regular admin users', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });

      const superGuard = TestBed.runInInjectionContext(() => superAdminGuard);
      const result = await lastValueFrom(superGuard(mockRoute, mockState));

      expect(result).toEqual(['/unauthorized']);
    });

    it('should allow super admin users', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'superadmin@example.com',
            role: 'super_admin',
            emailVerified: true
          },
          token: 'valid-token'
        }
      });

      const superGuard = TestBed.runInInjectionContext(() => superAdminGuard);
      const result = await lastValueFrom(superGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });
  });

  describe('System Admin Guard', () => {
    it('should require two-factor authentication', async () => {
      store.setState({
        auth: {
          isAuthenticated: true,
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'admin',
            emailVerified: true,
            twoFactorEnabled: false
          },
          token: 'valid-token'
        }
      });

      const systemGuard = TestBed.runInInjectionContext(() => systemAdminGuard);
      const result = await lastValueFrom(systemGuard(mockRoute, mockState));

      expect(result).toEqual(['/auth/setup-2fa']);
    });
  });
});