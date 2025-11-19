/**
 * Bundle Access Component
 *
 * Entry point for employers to access reference bundles.
 * Supports:
 * - Bundle link/ID entry
 * - Password protection
 * - Guest vs authenticated access
 * - Session management
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EmployerActions } from '../../store/employer.actions';
import {
  selectIsLoading,
  selectError,
  selectSession,
} from '../../store/employer.selectors';
import { BundleAccessService } from '../../services/bundle-access.service';
import { BundleAccessRequest } from '../../models/employer.models';

@Component({
  selector: 'app-bundle-access',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bundle-access.component.html',
  styleUrls: ['./bundle-access.component.scss'],
})
export class BundleAccessComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bundleAccess = inject(BundleAccessService);
  private readonly destroy$ = new Subject<void>();

  // Form
  accessForm!: FormGroup;

  // State signals
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly requiresPassword = signal(false);
  readonly showPasswordField = signal(false);
  readonly savedEmail = signal<string | null>(null);

  // Store selectors
  readonly loading$ = this.store.select(selectIsLoading);
  readonly error$ = this.store.select(selectError);
  readonly session$ = this.store.select(selectSession);

  // Computed values
  readonly canSubmit = computed(() => {
    return this.accessForm?.valid && !this.isLoading();
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadSavedEmail();
    this.checkExistingSession();
    this.handleQueryParams();
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize Form
   */
  private initializeForm(): void {
    this.accessForm = this.fb.group({
      bundleLink: ['', [Validators.required]],
      password: [''],
      viewerEmail: ['', [Validators.email]],
      rememberEmail: [false],
    });
  }

  /**
   * Load Saved Email from Storage
   */
  private loadSavedEmail(): void {
    const savedEmail = this.bundleAccess.getSavedViewerEmail();
    if (savedEmail) {
      this.savedEmail.set(savedEmail);
      this.accessForm.patchValue({ viewerEmail: savedEmail, rememberEmail: true });
    }
  }

  /**
   * Check Existing Session
   */
  private checkExistingSession(): void {
    const session = this.bundleAccess.getCurrentSession();
    if (session && this.bundleAccess.isSessionValid()) {
      // Redirect to bundle viewer
      this.router.navigate(['/employer/bundle-viewer', session.bundleId]);
    }
  }

  /**
   * Handle Query Parameters
   */
  private handleQueryParams(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      // Pre-fill bundle link if provided
      if (params['bundle'] || params['link']) {
        const link = params['bundle'] || params['link'];
        this.accessForm.patchValue({ bundleLink: link });
      }

      // Handle error messages
      if (params['error']) {
        switch (params['error']) {
          case 'expired':
            this.error.set('This bundle has expired and is no longer accessible.');
            break;
          case 'access_denied':
            this.error.set('Access denied. Please verify your credentials.');
            break;
          case 'invalid_link':
            this.error.set('Invalid bundle link. Please check and try again.');
            break;
          default:
            this.error.set('An error occurred. Please try again.');
        }
      }
    });
  }

  /**
   * Subscribe to Store Updates
   */
  private subscribeToStore(): void {
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading) => {
      this.isLoading.set(loading);
    });

    this.error$.pipe(takeUntil(this.destroy$)).subscribe((error) => {
      if (error) {
        this.error.set(error);

        // Check if password is required
        if (error.includes('password') || error.includes('protected')) {
          this.requiresPassword.set(true);
          this.showPasswordField.set(true);
          this.accessForm.get('password')?.setValidators([Validators.required]);
          this.accessForm.get('password')?.updateValueAndValidity();
        }
      }
    });
  }

  /**
   * Submit Access Request
   */
  onSubmit(): void {
    if (this.accessForm.invalid) {
      this.markFormGroupTouched(this.accessForm);
      return;
    }

    const formValue = this.accessForm.value;

    // Extract bundle ID from link
    const bundleId = this.bundleAccess.extractBundleIdFromLink(
      formValue.bundleLink
    );

    if (!bundleId) {
      this.error.set('Invalid bundle link format. Please check and try again.');
      return;
    }

    // Validate bundle ID format
    if (!this.bundleAccess.isValidBundleId(bundleId)) {
      this.error.set('Invalid bundle ID. Please check your link and try again.');
      return;
    }

    // Save email if requested
    if (formValue.rememberEmail && formValue.viewerEmail) {
      localStorage.setItem('deepref_viewer_email', formValue.viewerEmail);
    } else if (!formValue.rememberEmail) {
      this.bundleAccess.clearSavedViewerEmail();
    }

    // Build request
    const request: BundleAccessRequest = {
      bundleId,
      password: formValue.password || undefined,
      viewerEmail: formValue.viewerEmail || undefined,
    };

    // Dispatch access request
    this.store.dispatch(EmployerActions.requestBundleAccess({ request }));
    this.error.set(null);
  }

  /**
   * Clear Error
   */
  clearError(): void {
    this.error.set(null);
    this.store.dispatch(EmployerActions.clearError());
  }

  /**
   * Toggle Password Field
   */
  togglePasswordField(): void {
    this.showPasswordField.update((show) => !show);
    if (!this.showPasswordField()) {
      this.accessForm.get('password')?.clearValidators();
      this.accessForm.get('password')?.setValue('');
    } else {
      this.accessForm.get('password')?.setValidators([Validators.required]);
    }
    this.accessForm.get('password')?.updateValueAndValidity();
  }

  /**
   * Paste from Clipboard
   */
  async pasteFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.accessForm.patchValue({ bundleLink: text.trim() });
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }

  /**
   * Mark Form Group as Touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Get Field Error Message
   */
  getFieldError(fieldName: string): string | null {
    const control = this.accessForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }

    return 'Invalid value';
  }

  /**
   * Get Field Label
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      bundleLink: 'Bundle link or ID',
      password: 'Password',
      viewerEmail: 'Email address',
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if Field Has Error
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.accessForm.get(fieldName);
    return !!(control && control.touched && control.invalid);
  }
}
