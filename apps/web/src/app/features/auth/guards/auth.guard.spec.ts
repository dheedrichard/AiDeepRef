/**
 * Auth Guard Tests
 */

import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { authGuard } from './auth.guard';
import { selectIsAuthenticated } from '../store/auth.selectors';

describe('authGuard', () => {
  let store: MockStore;
  let router: Router;
  let guard: ReturnType<typeof authGuard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [{ selector: selectIsAuthenticated, value: false }],
        }),
        {
          provide: Router,
          useValue: {
            createUrlTree: jest.fn((commands: string[]) => {
              return { toString: () => commands.join('/') } as UrlTree;
            }),
          },
        },
      ],
    });

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
  });

  it('should allow navigation when authenticated', (done) => {
    store.overrideSelector(selectIsAuthenticated, true);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(null as any, null as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else {
        result.subscribe((canActivate) => {
          expect(canActivate).toBe(true);
          done();
        });
      }
    });
  });

  it('should redirect to signin when not authenticated', (done) => {
    store.overrideSelector(selectIsAuthenticated, false);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(null as any, null as any);

      if (result instanceof UrlTree) {
        expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/signin']);
        done();
      } else if (typeof result !== 'boolean') {
        result.subscribe((canActivate) => {
          expect(canActivate).toBeInstanceOf(UrlTree);
          expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/signin']);
          done();
        });
      }
    });
  });
});
