/**
 * Sign In Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SigninComponent } from './signin.component';
import { AuthActions } from '../../store/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth.selectors';

describe('SigninComponent', () => {
  let component: SigninComponent;
  let fixture: ComponentFixture<SigninComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SigninComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectIsLoading, value: false },
            { selector: selectError, value: null },
          ],
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(SigninComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should initialize with empty email', () => {
      expect(component.signInForm.get('email')?.value).toBe('');
    });

    it('should be invalid when email is empty', () => {
      expect(component.signInForm.valid).toBe(false);
    });

    it('should be invalid when email format is incorrect', () => {
      component.signInForm.patchValue({ email: 'invalid-email' });
      expect(component.signInForm.valid).toBe(false);
    });

    it('should be valid when email is correct', () => {
      component.signInForm.patchValue({ email: 'test@example.com' });
      expect(component.signInForm.valid).toBe(true);
    });
  });

  describe('Sign In Submission', () => {
    it('should dispatch signIn action on valid form submit', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const email = 'test@example.com';

      component.signInForm.patchValue({ email });
      component.onSubmit();

      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.signIn({ request: { email } })
      );
    });

    it('should not dispatch action on invalid form submit', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      component.signInForm.patchValue({ email: '' });
      component.onSubmit();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should set magicLinkSent to true after submit', () => {
      component.signInForm.patchValue({ email: 'test@example.com' });
      component.onSubmit();

      expect(component.magicLinkSent()).toBe(true);
    });
  });

  describe('Resend Functionality', () => {
    beforeEach(() => {
      component.signInForm.patchValue({ email: 'test@example.com' });
      component.onSubmit();
    });

    it('should dispatch resendMagicLink action', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      // Wait for countdown
      component.resendCountdown.set(0);
      component.onResend();

      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.resendMagicLink({ email: 'test@example.com' })
      );
    });

    it('should start countdown timer on submit', () => {
      expect(component.resendCountdown()).toBe(60);
    });

    it('should not allow resend when countdown is active', () => {
      expect(component.canResend()).toBe(false);
    });

    it('should allow resend when countdown reaches 0', () => {
      component.resendCountdown.set(0);
      expect(component.canResend()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clear timer on destroy', () => {
      component.signInForm.patchValue({ email: 'test@example.com' });
      component.onSubmit();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      component.ngOnDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
