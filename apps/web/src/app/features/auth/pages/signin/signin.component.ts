/**
 * Sign In Component (AUTH-02)
 *
 * Email magic link authentication flow.
 * Features:
 * - Email input with validation
 * - Send magic link button
 * - Resend functionality
 * - Loading/sent states
 */

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../store/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth.selectors';

@Component({
  selector: 'app-signin',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex">
      <!-- Left Content Area -->
      <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <!-- Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
            <p class="text-gray-600">
              We'll send you a magic link to sign in without a password
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

          <!-- Success Message -->
          @if (magicLinkSent()) {
            <div
              class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
              role="alert"
            >
              <div class="flex items-start">
                <svg
                  class="w-5 h-5 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div>
                  <p class="font-medium">Magic link sent!</p>
                  <p class="text-sm mt-1">Check your email to continue</p>
                </div>
              </div>
            </div>
          }

          <!-- Sign In Form -->
          <form [formGroup]="signInForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="info@email.com"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent transition-all"
                [class.border-red-500]="
                  signInForm.get('email')?.invalid && signInForm.get('email')?.touched
                "
                aria-label="Email address"
                aria-required="true"
                [attr.aria-invalid]="
                  signInForm.get('email')?.invalid && signInForm.get('email')?.touched
                "
              />
              @if (signInForm.get('email')?.invalid && signInForm.get('email')?.touched) {
                <p class="mt-2 text-sm text-red-600" role="alert">
                  @if (signInForm.get('email')?.errors?.['required']) {
                    Email is required
                  } @else if (signInForm.get('email')?.errors?.['email']) {
                    Please enter a valid email address
                  }
                </p>
              }
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="signInForm.invalid || isLoading()"
              class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send magic link"
            >
              @if (isLoading()) {
                <span class="flex items-center justify-center">
                  <svg
                    class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Sending...
                </span>
              } @else {
                Send Magic Link
              }
            </button>

            <!-- Resend Link -->
            @if (magicLinkSent()) {
              <div class="text-center">
                <button
                  type="button"
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
            }
          </form>

          <!-- Divider -->
          <div class="mt-8 mb-8">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-gray-50 text-gray-500">Don't have an account?</span>
              </div>
            </div>
          </div>

          <!-- Sign Up Link -->
          <div class="text-center">
            <a
              routerLink="/auth/signup"
              class="text-primary-purple hover:underline font-medium"
            >
              Create an account
            </a>
          </div>

          <!-- Footer Links -->
          <div class="mt-8 text-center text-sm text-gray-500 space-x-4">
            <a href="#" class="hover:text-gray-700">Privacy Policy</a>
            <span>•</span>
            <a href="#" class="hover:text-gray-700">Terms of Service</a>
          </div>
        </div>
      </div>

      <!-- Right Illustration Area -->
      <div class="hidden lg:flex lg:w-1/2 bg-gray-100 items-center justify-center p-12">
        <div class="text-center">
          <div class="w-64 h-64 mx-auto bg-gray-200 rounded-lg mb-6 flex items-center justify-center">
            <svg
              class="w-32 h-32 text-gray-400"
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
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Check your inbox</h2>
          <p class="text-gray-600">We'll send you a secure link to sign in instantly</p>
        </div>
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
export class SigninComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  // Form
  signInForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // State signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);
  magicLinkSent = signal(false);
  resendCountdown = signal(0);
  canResend = computed(() => this.resendCountdown() === 0);

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Submit sign in form
   */
  onSubmit(): void {
    if (this.signInForm.valid) {
      const email = this.signInForm.value.email!;
      this.store.dispatch(AuthActions.signIn({ request: { email } }));
      this.magicLinkSent.set(true);
      this.startResendTimer();
    }
  }

  /**
   * Resend magic link
   */
  onResend(): void {
    if (this.canResend() && this.signInForm.valid) {
      const email = this.signInForm.value.email!;
      this.store.dispatch(AuthActions.resendMagicLink({ email }));
      this.startResendTimer();
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
