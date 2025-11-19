/**
 * Sign Up Component (AUTH-03)
 *
 * User registration flow with role selection.
 * Features:
 * - First/Last name fields
 * - Email field
 * - Password field
 * - Role selection (Seeker/Referrer/Employer)
 * - Keep me signed in checkbox
 * - Form validation
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../store/auth.actions';
import { selectIsLoading, selectError } from '../../store/auth.selectors';
import { UserRole } from '../../models/auth.models';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex">
      <!-- Left Content Area -->
      <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <!-- Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p class="text-gray-600">Get started with DeepRef today</p>
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

          <!-- Sign Up Form -->
          <form [formGroup]="signUpForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  formControlName="firstName"
                  placeholder="John"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent transition-all"
                  [class.border-red-500]="
                    signUpForm.get('firstName')?.invalid &&
                    signUpForm.get('firstName')?.touched
                  "
                  aria-label="First name"
                  aria-required="true"
                />
                @if (signUpForm.get('firstName')?.invalid &&
                signUpForm.get('firstName')?.touched) {
                  <p class="mt-2 text-sm text-red-600" role="alert">First name is required</p>
                }
              </div>

              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  formControlName="lastName"
                  placeholder="Doe"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent transition-all"
                  [class.border-red-500]="
                    signUpForm.get('lastName')?.invalid && signUpForm.get('lastName')?.touched
                  "
                  aria-label="Last name"
                  aria-required="true"
                />
                @if (signUpForm.get('lastName')?.invalid && signUpForm.get('lastName')?.touched)
                {
                  <p class="mt-2 text-sm text-red-600" role="alert">Last name is required</p>
                }
              </div>
            </div>

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
                  signUpForm.get('email')?.invalid && signUpForm.get('email')?.touched
                "
                aria-label="Email address"
                aria-required="true"
              />
              @if (signUpForm.get('email')?.invalid && signUpForm.get('email')?.touched) {
                <p class="mt-2 text-sm text-red-600" role="alert">
                  @if (signUpForm.get('email')?.errors?.['required']) {
                    Email is required
                  } @else if (signUpForm.get('email')?.errors?.['email']) {
                    Please enter a valid email address
                  }
                </p>
              }
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent transition-all"
                [class.border-red-500]="
                  signUpForm.get('password')?.invalid && signUpForm.get('password')?.touched
                "
                aria-label="Password"
                aria-required="true"
              />
              @if (signUpForm.get('password')?.invalid && signUpForm.get('password')?.touched) {
                <p class="mt-2 text-sm text-red-600" role="alert">
                  @if (signUpForm.get('password')?.errors?.['required']) {
                    Password is required
                  } @else if (signUpForm.get('password')?.errors?.['minlength']) {
                    Password must be at least 8 characters
                  }
                </p>
              }
              <p class="mt-2 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <!-- Role Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">I am a</label>
              <div class="space-y-3">
                <label
                  class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all"
                  [class.border-primary-purple]="signUpForm.get('role')?.value === userRoles.SEEKER"
                  [class.bg-primary-purple]="signUpForm.get('role')?.value === userRoles.SEEKER"
                  [class.bg-opacity-5]="signUpForm.get('role')?.value === userRoles.SEEKER"
                  [class.border-gray-300]="signUpForm.get('role')?.value !== userRoles.SEEKER"
                >
                  <input
                    type="radio"
                    formControlName="role"
                    [value]="userRoles.SEEKER"
                    class="w-4 h-4 text-primary-purple border-gray-300 focus:ring-primary-purple"
                    aria-label="I am a job seeker"
                  />
                  <span class="ml-3">
                    <span class="block font-medium text-gray-900">Job Seeker</span>
                    <span class="block text-sm text-gray-600"
                      >Looking to collect and manage references</span
                    >
                  </span>
                </label>

                <label
                  class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all"
                  [class.border-primary-purple]="
                    signUpForm.get('role')?.value === userRoles.REFERRER
                  "
                  [class.bg-primary-purple]="
                    signUpForm.get('role')?.value === userRoles.REFERRER
                  "
                  [class.bg-opacity-5]="signUpForm.get('role')?.value === userRoles.REFERRER"
                  [class.border-gray-300]="signUpForm.get('role')?.value !== userRoles.REFERRER"
                >
                  <input
                    type="radio"
                    formControlName="role"
                    [value]="userRoles.REFERRER"
                    class="w-4 h-4 text-primary-purple border-gray-300 focus:ring-primary-purple"
                    aria-label="I am a referrer"
                  />
                  <span class="ml-3">
                    <span class="block font-medium text-gray-900">Referrer</span>
                    <span class="block text-sm text-gray-600"
                      >Providing references for others</span
                    >
                  </span>
                </label>

                <label
                  class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all"
                  [class.border-primary-purple]="
                    signUpForm.get('role')?.value === userRoles.EMPLOYER
                  "
                  [class.bg-primary-purple]="
                    signUpForm.get('role')?.value === userRoles.EMPLOYER
                  "
                  [class.bg-opacity-5]="signUpForm.get('role')?.value === userRoles.EMPLOYER"
                  [class.border-gray-300]="signUpForm.get('role')?.value !== userRoles.EMPLOYER"
                >
                  <input
                    type="radio"
                    formControlName="role"
                    [value]="userRoles.EMPLOYER"
                    class="w-4 h-4 text-primary-purple border-gray-300 focus:ring-primary-purple"
                    aria-label="I am an employer"
                  />
                  <span class="ml-3">
                    <span class="block font-medium text-gray-900">Employer</span>
                    <span class="block text-sm text-gray-600"
                      >Viewing and verifying references</span
                    >
                  </span>
                </label>
              </div>
            </div>

            <!-- Keep Me Signed In -->
            <div class="flex items-center">
              <input
                id="keepMeSignedIn"
                type="checkbox"
                formControlName="keepMeSignedIn"
                class="w-4 h-4 text-primary-purple border-gray-300 rounded focus:ring-primary-purple"
                aria-label="Keep me signed in"
              />
              <label for="keepMeSignedIn" class="ml-2 text-sm text-gray-700">
                Keep me signed in
              </label>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="signUpForm.invalid || isLoading()"
              class="w-full bg-primary-purple hover:bg-primary-purple-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Create account"
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
                  Creating account...
                </span>
              } @else {
                Create Account
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="mt-8 mb-8">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-gray-50 text-gray-500">Already have an account?</span>
              </div>
            </div>
          </div>

          <!-- Sign In Link -->
          <div class="text-center">
            <a routerLink="/auth/signin" class="text-primary-purple hover:underline font-medium">
              Sign in instead
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Join DeepRef</h2>
          <p class="text-gray-600">
            Build trust with AI-verified professional references
          </p>
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
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  // Expose UserRole enum to template
  userRoles = UserRole;

  // Form
  signUpForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: [UserRole.SEEKER, Validators.required],
    keepMeSignedIn: [true],
  });

  // State signals
  isLoading = this.store.selectSignal(selectIsLoading);
  error = this.store.selectSignal(selectError);

  /**
   * Submit sign up form
   */
  onSubmit(): void {
    if (this.signUpForm.valid) {
      const formValue = this.signUpForm.getRawValue();
      this.store.dispatch(
        AuthActions.signUp({
          request: {
            firstName: formValue.firstName,
            lastName: formValue.lastName,
            email: formValue.email,
            password: formValue.password,
            role: formValue.role,
            keepMeSignedIn: formValue.keepMeSignedIn,
          },
        })
      );
    }
  }
}
