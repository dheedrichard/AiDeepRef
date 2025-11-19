/**
 * Reach-Back Component
 *
 * Allows employers to request additional verification from referrers.
 * Features:
 * - Form to submit additional questions
 * - Track reach-back request status
 * - Only available if seeker permitted
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@angular/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EmployerActions } from '../../store/employer.actions';
import {
  selectCurrentReference,
  selectIsLoading,
  selectError,
} from '../../store/employer.selectors';
import { BundleAccessService } from '../../services/bundle-access.service';

@Component({
  selector: 'app-reach-back',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="reach-back-container">
      <div class="reach-back-card">
        <button class="back-button" (click)="goBack()">← Back</button>

        <h1>Request Additional Information</h1>
        <p class="subtitle">
          Submit a follow-up question to the referrer for additional verification.
        </p>

        @if (error$ | async; as error) {
          <div class="alert alert-error">{{ error }}</div>
        }

        <form [formGroup]="reachBackForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="question">Your Question *</label>
            <textarea
              id="question"
              formControlName="question"
              rows="5"
              placeholder="What additional information would you like from this referrer?"
              class="form-input"
            ></textarea>
            @if (reachBackForm.get('question')?.invalid && reachBackForm.get('question')?.touched) {
              <div class="field-error">Question is required</div>
            }
          </div>

          <div class="form-group">
            <label for="context">Context (optional)</label>
            <textarea
              id="context"
              formControlName="context"
              rows="3"
              placeholder="Provide any additional context for your request"
              class="form-input"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="requestorEmail">Your Email *</label>
            <input
              id="requestorEmail"
              type="email"
              formControlName="requestorEmail"
              placeholder="your@email.com"
              class="form-input"
            />
            @if (reachBackForm.get('requestorEmail')?.invalid && reachBackForm.get('requestorEmail')?.touched) {
              <div class="field-error">Valid email is required</div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="reachBackForm.invalid || (isLoading$ | async)"
          >
            @if (isLoading$ | async) {
              <span class="spinner"></span>
              Sending...
            } @else {
              Send Request
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .reach-back-container {
      min-height: 100vh;
      background: #f7fafc;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reach-back-card {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .back-button {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      font-size: 0.875rem;
      margin-bottom: 1rem;

      &:hover {
        text-decoration: underline;
      }
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 0.5rem;
    }

    .subtitle {
      color: #718096;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;

      label {
        display: block;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .form-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: #667eea;
        }
      }

      .field-error {
        color: #e53e3e;
        font-size: 0.75rem;
        margin-top: 0.375rem;
      }
    }

    .btn {
      width: 100%;
      padding: 0.875rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;

      &.btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;

      &.alert-error {
        background: #fee;
        color: #c53030;
      }
    }
  `],
})
export class ReachBackComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bundleAccess = inject(BundleAccessService);
  private readonly destroy$ = new Subject<void>();

  reachBackForm!: FormGroup;

  readonly reference$ = this.store.select(selectCurrentReference);
  readonly isLoading$ = this.store.select(selectIsLoading);
  readonly error$ = this.store.select(selectError);

  ngOnInit(): void {
    this.initializeForm();
    this.loadSavedEmail();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.reachBackForm = this.fb.group({
      question: ['', [Validators.required, Validators.minLength(10)]],
      context: [''],
      requestorEmail: ['', [Validators.required, Validators.email]],
    });
  }

  private loadSavedEmail(): void {
    const savedEmail = this.bundleAccess.getSavedViewerEmail();
    if (savedEmail) {
      this.reachBackForm.patchValue({ requestorEmail: savedEmail });
    }
  }

  onSubmit(): void {
    if (this.reachBackForm.invalid) return;

    const referenceId = this.route.snapshot.paramMap.get('referenceId');
    const bundleId = this.route.snapshot.queryParamMap.get('bundleId');

    if (!referenceId || !bundleId) return;

    this.store.dispatch(
      EmployerActions.requestReachBack({
        request: {
          referenceId,
          bundleId,
          question: this.reachBackForm.value.question,
          context: this.reachBackForm.value.context,
          requestorEmail: this.reachBackForm.value.requestorEmail,
        },
      })
    );

    // Navigate back on success
    setTimeout(() => {
      this.goBack();
    }, 2000);
  }

  goBack(): void {
    const bundleId = this.route.snapshot.queryParamMap.get('bundleId');
    const referenceId = this.route.snapshot.paramMap.get('referenceId');

    if (referenceId) {
      this.router.navigate(['/employer/reference-detail', referenceId], {
        queryParams: { bundleId },
      });
    } else if (bundleId) {
      this.router.navigate(['/employer/bundle-viewer', bundleId]);
    } else {
      this.router.navigate(['/employer/bundle-access']);
    }
  }
}
