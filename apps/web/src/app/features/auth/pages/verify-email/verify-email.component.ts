/**
 * Verify Email Component (AUTH-04)
 *
 * Magic link sent confirmation and email verification flow.
 * Features:
 * - "Check inbox" message
 * - Open mail app button
 * - Resend link
 * - Auto-redirect on verification
 */

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../store/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth.selectors';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Success Icon -->
        <div class="text-center mb-8">
          <div
            class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 class="text-3xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p class="text-gray-600">
            We've sent you a magic link to sign in. Click the link in your email to continue.
          </p>
        </div>

        <!-- Error Message -->
        @if (error()) {
          <div
            class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
            role="alert"
          >
            {{ error() }}
          </div>
        }

        <!-- Success Message (for resend) -->
        @if (resendSuccess()) {
          <div
            class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
            role="alert"
          >
            Magic link resent successfully! Check your inbox.
          </div>
        }

        <!-- Card -->
        <div class="bg-white rounded-lg shadow-md p-8 space-y-6">
          <!-- Email Address (if available) -->
          @if (emailAddress()) {
            <div class="text-center">
              <p class="text-sm text-gray-600 mb-1">Email sent to:</p>
              <p class="font-medium text-gray-900">{{ emailAddress() }}</p>
            </div>
          }

          <!-- Open Mail App Button -->
          <button
            (click)="openMailApp()"
            class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            aria-label="Open mail app"
          >
            Open Mail App
          </button>

          <!-- Resend Link -->
          <div class="text-center">
            <p class="text-sm text-gray-600 mb-2">Didn't receive the email?</p>
            <button
              (click)="onResend()"
              [disabled]="isLoading() || !canResend()"
              class="text-primary-purple hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Resend magic link"
            >
              @if (canResend()) {
                Resend magic link
              } @else {
                Resend in {{ resendCountdown() }}s
              }
            </button>
          </div>

          <!-- Help Text -->
          <div class="border-t pt-6">
            <p class="text-sm text-gray-600 text-center">
              Make sure to check your spam folder. The email should arrive within a few minutes.
            </p>
          </div>
        </div>

        <!-- Tips -->
        <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="font-medium text-blue-900 mb-2">Tips:</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email address</li>
            <li>• The link expires after 24 hours</li>
            <li>• You can request a new link at any time</li>
          </ul>
        </div>

        <!-- Verifying State (when token is present in URL) -->
        @if (isVerifying()) {
          <div class="mt-8 text-center">
            <div class="inline-flex items-center px-6 py-3 bg-white rounded-lg shadow-md">
              <svg
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-purple"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span class="text-gray-700 font-medium">Verifying your email...</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  // State signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);
  emailAddress = signal<string | null>(null);
  resendSuccess = signal(false);
  resendCountdown = signal(60);
  canResend = computed(() => this.resendCountdown() === 0);
  isVerifying = signal(false);

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Check for email in query params (from sign-in page)
    const email = this.route.snapshot.queryParams['email'];
    if (email) {
      this.emailAddress.set(email);
    }

    // Check for verification token in query params (from email link)
    const token = this.route.snapshot.queryParams['token'];
    if (token) {
      this.verifyEmail(token);
    }

    // Start resend countdown
    this.startResendTimer();
  }

  /**
   * Verify email with token
   */
  private verifyEmail(token: string): void {
    this.isVerifying.set(true);
    this.store.dispatch(AuthActions.verifyEmail({ request: { token } }));
  }

  /**
   * Open default mail app
   */
  openMailApp(): void {
    window.location.href = 'mailto:';
  }

  /**
   * Resend magic link
   */
  onResend(): void {
    if (this.canResend() && this.emailAddress()) {
      const email = this.emailAddress()!;
      this.store.dispatch(AuthActions.resendMagicLink({ email }));
      this.resendSuccess.set(true);
      this.startResendTimer();

      // Hide success message after 5 seconds
      setTimeout(() => {
        this.resendSuccess.set(false);
      }, 5000);
    }
  }

  /**
   * Start countdown timer for resend button
   */
  private startResendTimer(): void {
    this.resendCountdown.set(60);

    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }

    this.resendTimer = setInterval(() => {
      const current = this.resendCountdown();
      if (current > 0) {
        this.resendCountdown.set(current - 1);
      } else {
        if (this.resendTimer) {
          clearInterval(this.resendTimer);
          this.resendTimer = null;
        }
      }
    }, 1000);
  }

  /**
   * Cleanup timer on component destroy
   */
  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }
}
