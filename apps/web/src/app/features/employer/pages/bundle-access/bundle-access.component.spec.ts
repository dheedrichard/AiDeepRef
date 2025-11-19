/**
 * Bundle Access Component Unit Tests
 *
 * Tests bundle access form, validation, and session handling.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, BehaviorSubject } from 'rxjs';

import { BundleAccessComponent } from './bundle-access.component';
import { BundleAccessService } from '../../services/bundle-access.service';
import { EmployerActions } from '../../store/employer.actions';

describe('BundleAccessComponent', () => {
  let component: BundleAccessComponent;
  let fixture: ComponentFixture<BundleAccessComponent>;
  let store: MockStore;
  let bundleAccessService: jasmine.SpyObj<BundleAccessService>;
  let router: jasmine.SpyObj<Router>;
  let queryParams: BehaviorSubject<any>;

  const initialState = {
    employer: {
      isLoading: false,
      error: null,
      session: null,
    },
  };

  beforeEach(async () => {
    queryParams = new BehaviorSubject({});

    const bundleAccessServiceSpy = jasmine.createSpyObj('BundleAccessService', [
      'getCurrentSession',
      'isSessionValid',
      'extractBundleIdFromLink',
      'isValidBundleId',
      'getSavedViewerEmail',
      'clearSavedViewerEmail',
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [BundleAccessComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: BundleAccessService, useValue: bundleAccessServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParams.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BundleAccessComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    bundleAccessService = TestBed.inject(
      BundleAccessService
    ) as jasmine.SpyObj<BundleAccessService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with required fields', () => {
      fixture.detectChanges();

      expect(component.accessForm).toBeDefined();
      expect(component.accessForm.get('bundleLink')).toBeDefined();
      expect(component.accessForm.get('password')).toBeDefined();
      expect(component.accessForm.get('viewerEmail')).toBeDefined();
      expect(component.accessForm.get('rememberEmail')).toBeDefined();
    });

    it('should load saved email on init', () => {
      const savedEmail = 'saved@test.com';
      bundleAccessService.getSavedViewerEmail.and.returnValue(savedEmail);

      fixture.detectChanges();

      expect(component.accessForm.get('viewerEmail')?.value).toBe(savedEmail);
      expect(component.accessForm.get('rememberEmail')?.value).toBe(true);
    });

    it('should not load email if not saved', () => {
      bundleAccessService.getSavedViewerEmail.and.returnValue(null);

      fixture.detectChanges();

      expect(component.accessForm.get('viewerEmail')?.value).toBe('');
      expect(component.accessForm.get('rememberEmail')?.value).toBe(false);
    });
  });

  describe('Session Check', () => {
    it('should redirect to bundle viewer if valid session exists', () => {
      const mockSession = {
        bundleId: 'test123',
        sessionId: 'session123',
        expiresAt: Date.now() + 86400000,
      };

      bundleAccessService.getCurrentSession.and.returnValue(mockSession as any);
      bundleAccessService.isSessionValid.and.returnValue(true);

      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith([
        '/employer/bundle-viewer',
        'test123',
      ]);
    });

    it('should not redirect if no valid session', () => {
      bundleAccessService.getCurrentSession.and.returnValue(null);
      bundleAccessService.isSessionValid.and.returnValue(false);

      fixture.detectChanges();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Query Parameters', () => {
    it('should pre-fill bundle link from query params', () => {
      queryParams.next({ bundle: 'test123' });

      fixture.detectChanges();

      expect(component.accessForm.get('bundleLink')?.value).toBe('test123');
    });

    it('should handle error query param', () => {
      queryParams.next({ error: 'expired' });

      fixture.detectChanges();

      expect(component.error()).toContain('expired');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require bundle link', () => {
      const bundleLinkControl = component.accessForm.get('bundleLink');
      bundleLinkControl?.setValue('');

      expect(bundleLinkControl?.hasError('required')).toBe(true);
      expect(component.accessForm.valid).toBe(false);
    });

    it('should validate email format', () => {
      const emailControl = component.accessForm.get('viewerEmail');
      emailControl?.setValue('invalid-email');

      expect(emailControl?.hasError('email')).toBe(true);
    });

    it('should accept valid email', () => {
      const emailControl = component.accessForm.get('viewerEmail');
      emailControl?.setValue('valid@email.com');

      expect(emailControl?.hasError('email')).toBe(false);
    });
  });

  describe('Password Field', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle password field visibility', () => {
      expect(component.showPasswordField()).toBe(false);

      component.togglePasswordField();

      expect(component.showPasswordField()).toBe(true);
    });

    it('should clear password when hiding field', () => {
      component.showPasswordField.set(true);
      component.accessForm.get('password')?.setValue('test-password');

      component.togglePasswordField();

      expect(component.accessForm.get('password')?.value).toBe('');
      expect(component.showPasswordField()).toBe(false);
    });

    it('should add required validator when showing password', () => {
      component.togglePasswordField();

      const passwordControl = component.accessForm.get('password');
      expect(passwordControl?.hasError('required')).toBe(true);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not submit invalid form', () => {
      component.accessForm.get('bundleLink')?.setValue('');
      component.onSubmit();

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should extract bundle ID and dispatch action on valid submission', () => {
      const bundleLink = 'https://deepref.com/b/test123';
      bundleAccessService.extractBundleIdFromLink.and.returnValue('test123');
      bundleAccessService.isValidBundleId.and.returnValue(true);

      component.accessForm.patchValue({
        bundleLink,
        viewerEmail: 'viewer@test.com',
      });

      component.onSubmit();

      expect(bundleAccessService.extractBundleIdFromLink).toHaveBeenCalledWith(
        bundleLink
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Employer] Request Bundle Access',
        })
      );
    });

    it('should show error for invalid bundle ID', () => {
      bundleAccessService.extractBundleIdFromLink.and.returnValue(null);

      component.accessForm.patchValue({
        bundleLink: 'invalid-link',
      });

      component.onSubmit();

      expect(component.error()).toContain('Invalid bundle link');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should save email when remember is checked', () => {
      bundleAccessService.extractBundleIdFromLink.and.returnValue('test123');
      bundleAccessService.isValidBundleId.and.returnValue(true);

      component.accessForm.patchValue({
        bundleLink: 'test123',
        viewerEmail: 'remember@test.com',
        rememberEmail: true,
      });

      component.onSubmit();

      expect(localStorage.getItem('deepref_viewer_email')).toBe(
        'remember@test.com'
      );
    });

    it('should clear saved email when remember is unchecked', () => {
      localStorage.setItem('deepref_viewer_email', 'old@test.com');
      bundleAccessService.extractBundleIdFromLink.and.returnValue('test123');
      bundleAccessService.isValidBundleId.and.returnValue(true);

      component.accessForm.patchValue({
        bundleLink: 'test123',
        rememberEmail: false,
      });

      component.onSubmit();

      expect(bundleAccessService.clearSavedViewerEmail).toHaveBeenCalled();
    });
  });

  describe('Clipboard Paste', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should paste from clipboard', async () => {
      const clipboardText = 'test123';
      spyOn(navigator.clipboard, 'readText').and.returnValue(
        Promise.resolve(clipboardText)
      );

      await component.pasteFromClipboard();

      expect(component.accessForm.get('bundleLink')?.value).toBe(clipboardText);
    });

    it('should handle clipboard error gracefully', async () => {
      spyOn(navigator.clipboard, 'readText').and.returnValue(
        Promise.reject('Clipboard error')
      );

      await component.pasteFromClipboard();

      // Should not throw error
      expect(component.accessForm.get('bundleLink')?.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear error on clearError()', () => {
      component.error.set('Some error');
      component.clearError();

      expect(component.error()).toBeNull();
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Employer] Clear Error',
        })
      );
    });
  });

  describe('Field Error Messages', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return error message for required field', () => {
      const control = component.accessForm.get('bundleLink');
      control?.markAsTouched();
      control?.setValue('');

      const error = component.getFieldError('bundleLink');
      expect(error).toContain('required');
    });

    it('should return error message for invalid email', () => {
      const control = component.accessForm.get('viewerEmail');
      control?.markAsTouched();
      control?.setValue('invalid');

      const error = component.getFieldError('viewerEmail');
      expect(error).toContain('valid email');
    });

    it('should return null for valid field', () => {
      const control = component.accessForm.get('bundleLink');
      control?.markAsTouched();
      control?.setValue('test123');

      const error = component.getFieldError('bundleLink');
      expect(error).toBeNull();
    });
  });
});
